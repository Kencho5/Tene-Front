import { ComboboxItems } from '@core/interfaces/combobox.interface';
import { CategoryTreeNode } from '@core/interfaces/categories.interface';

export function flattenCategoryTree(
  nodes: CategoryTreeNode[],
  depth: number = 0,
): ComboboxItems[] {
  let result: ComboboxItems[] = [];

  nodes.forEach((node) => {
    result.push({
      label: node.name,
      value: `${depth}:${node.id}`,
    });

    if (node.children && node.children.length > 0) {
      result = result.concat(flattenCategoryTree(node.children, depth + 1));
    }
  });

  return result;
}

export function addNoneOption(
  categories: ComboboxItems[],
  noneLabel: string = 'არცერთი (მთავარი კატეგორია)',
): ComboboxItems[] {
  return [{ label: noneLabel, value: 'null' }, ...categories];
}
