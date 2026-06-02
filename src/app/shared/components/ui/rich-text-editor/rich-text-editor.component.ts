import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  PLATFORM_ID,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import Youtube from '@tiptap/extension-youtube';

export type EditorImageUploadHandler = (file: File) => Promise<string>;

const IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

@Component({
  selector: 'app-rich-text-editor',
  templateUrl: './rich-text-editor.component.html',
  styleUrl: './rich-text-editor.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RichTextEditorComponent implements AfterViewInit, OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);

  readonly value = input<string>('');
  readonly placeholder = input<string>('');
  readonly invalid = input<boolean>(false);
  readonly uploadHandler = input<EditorImageUploadHandler | null>(null);

  readonly valueChange = output<string>();
  readonly uploadError = output<string>();

  readonly editorEl = viewChild.required<ElementRef<HTMLDivElement>>('editorEl');
  readonly fileInput = viewChild.required<ElementRef<HTMLInputElement>>('fileInput');

  readonly acceptList = IMAGE_TYPES.join(',');

  private editor: Editor | null = null;
  readonly editorState = signal(0);
  readonly uploading = signal(false);
  readonly dragOver = signal(false);

  constructor() {
    effect(() => {
      const incoming = this.value();
      if (this.editor && incoming !== this.editor.getHTML()) {
        this.editor.commands.setContent(incoming || '', { emitUpdate: false });
      }
    });
  }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.editor = new Editor({
      element: this.editorEl().nativeElement,
      extensions: [
        StarterKit,
        Link.configure({ openOnClick: false }),
        Image,
        Youtube.configure({ nocookie: true, width: 640, height: 360 }),
        Placeholder.configure({ placeholder: this.placeholder() }),
      ],
      content: this.value() || '',
      editorProps: {
        handlePaste: (_view, event) => {
          const files = this.imageFiles(event.clipboardData?.files);
          if (files.length === 0) return false;
          event.preventDefault();
          this.uploadImages(files);
          return true;
        },
        handleDrop: (_view, event) => {
          const files = this.imageFiles((event as DragEvent).dataTransfer?.files);
          if (files.length === 0) return false;
          event.preventDefault();
          this.uploadImages(files);
          return true;
        },
      },
      onUpdate: ({ editor }) => {
        const html = editor.isEmpty ? '' : editor.getHTML();
        this.valueChange.emit(html);
        this.editorState.update((n) => n + 1);
      },
      onSelectionUpdate: () => this.editorState.update((n) => n + 1),
    });
    this.editorState.update((n) => n + 1);
  }

  ngOnDestroy(): void {
    this.editor?.destroy();
  }

  isActive(name: string, attrs?: Record<string, unknown>): boolean {
    this.editorState();
    return this.editor?.isActive(name, attrs) ?? false;
  }

  toggleBold(): void {
    this.editor?.chain().focus().toggleBold().run();
  }

  toggleItalic(): void {
    this.editor?.chain().focus().toggleItalic().run();
  }

  toggleHeading(level: 2 | 3): void {
    this.editor?.chain().focus().toggleHeading({ level }).run();
  }

  toggleBulletList(): void {
    this.editor?.chain().focus().toggleBulletList().run();
  }

  toggleOrderedList(): void {
    this.editor?.chain().focus().toggleOrderedList().run();
  }

  toggleBlockquote(): void {
    this.editor?.chain().focus().toggleBlockquote().run();
  }

  setLink(): void {
    if (!this.editor) return;
    const previous = this.editor.getAttributes('link')['href'] as string | undefined;
    const url = window.prompt('ბმული (URL)', previous ?? 'https://');
    if (url === null) return;
    if (url === '') {
      this.editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    this.editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }

  addYoutube(): void {
    if (!this.editor) return;
    const url = window.prompt('YouTube ვიდეოს ბმული');
    if (!url) return;
    this.editor.commands.setYoutubeVideo({ src: url });
  }

  triggerFilePicker(): void {
    this.fileInput().nativeElement.click();
  }

  onFilesPicked(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) this.uploadImages(this.imageFiles(input.files));
    input.value = '';
  }

  onDragOver(event: DragEvent): void {
    if (!this.uploadHandler()) return;
    event.preventDefault();
    this.dragOver.set(true);
  }

  onDragLeave(): void {
    this.dragOver.set(false);
  }

  onDrop(): void {
    this.dragOver.set(false);
  }

  clearFormat(): void {
    this.editor?.chain().focus().clearNodes().unsetAllMarks().run();
  }

  private imageFiles(list: FileList | null | undefined): File[] {
    return Array.from(list ?? []).filter((file) => IMAGE_TYPES.includes(file.type));
  }

  private async uploadImages(files: File[]): Promise<void> {
    const handler = this.uploadHandler();
    if (!handler || !this.editor || files.length === 0) return;

    this.uploading.set(true);
    for (const file of files) {
      try {
        const url = await handler(file);
        this.editor.chain().focus().setImage({ src: url }).run();
      } catch {
        this.uploadError.emit('სურათის ატვირთვა ვერ მოხერხდა');
      }
    }
    this.uploading.set(false);
  }
}
