import { HomeCard } from '@core/interfaces/home.interface';

export const homeCards: HomeCard[] = [
  {
    image: 'cable',
    title: 'პროდუქცია',
    subtext: 'გაეცანი რა პროდუქციის შეძენა შეგიძლია ტენეში.',
    button: 'ნახე სრულად',
    route: 'products',
  },
  {
    image: 'bin',
    title: 'ურნები',
    subtext: 'დაახარისხე ნარჩენები და ისარგებლე გატანის სერვისით.',
    button: 'ნახე ურნის ტიპები',
    route: 'bins',
  },
  {
    image: 'coins',
    title: 'ტენე ქულები',
    subtext: 'ჩაგვაბარე ნარჩენები, დააგროვე ქულები და აირჩიე საჩუქრები.',
    button: 'ნახე რაში დახარჯავ ქულებს',
    route: 'coins',
  },
  {
    image: 'recycle',
    title: 'გადადნობა',
    subtext: 'გადამდნარი პლასტმასისგან ნებისმიერი ნივთი შეგვიძლია დაგიმზადოთ.',
    button: 'გაეცანი ჩვენს ნაკეთობებს',
    route: 'recycle',
  },
  {
    image: 'referral',
    title: 'გამოიმუშავე თანხა',
    subtext:
      'ჩაერთე ჩვენს Affiliate Marketing პროგრამაში და მიიღე გაყიდვებიდან საკომისი.',
    button: 'შექმენი კოდი',
    route: 'earn',
  },
  {
    image: 'about',
    title: 'ჩვენს შესახებ',
    subtext:
      'ჩვენი გუნდი ყოველდღიურად მუშაობს ეკოლოგიური მომავლის შექმნაზე და გარემოს დაცვაზე.',
    button: 'გაიგე მეტი',
    route: 'about',
  },
  {
    image: 'blog',
    title: 'ბლოგები',
    subtext:
      'გაეცანი ჩვებს ბლოგებს და გაიგე მეტი სიახლე ეკოლოგიასთან დაკავშირებით.',
    button: 'ნახე სრულად ',
    route: 'blog',
  },
  {
    image: 'contact',
    title: 'კონტაქტი',
    subtext: 'ნახეთ ტელეფონი, ელფოსტა, მისამართი და სამუშაო საათები დეტალურად.',
    button: 'ნახე საკონტაქტო დეტალები',
    route: 'contact',
  },
];
