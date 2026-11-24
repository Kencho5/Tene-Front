export interface Retailer {
  name: string;
  logo: string;
  background: string;
  fit: 'cover' | 'contain';
}

export const retailers: Retailer[] = [
  {
    name: 'სუფთა სახლი',
    logo: '/assets/images/stores/suftasaxli.png',
    background: '#ffffff',
    fit: 'contain',
  },
  {
    name: 'ფრესკო',
    logo: '/assets/images/stores/fresco.svg',
    background: '#75B743',
    fit: 'contain',
  },
  {
    name: 'უნივერსამი',
    logo: '/assets/images/stores/universami.jpeg',
    background: '#D42E34',
    fit: 'cover',
  },
  {
    name: 'მეინ მარტი',
    logo: '/assets/images/stores/mainmart.png',
    background: '#ffffff',
    fit: 'cover',
  },
  {
    name: 'ზღაპარი',
    logo: '/assets/images/stores/zgapari.jpeg',
    background: '#FDD835',
    fit: 'cover',
  },
  {
    name: 'ლუკოილ ჯორჯია',
    logo: '/assets/images/stores/lukoil.jpeg',
    background: '#C8102E',
    fit: 'cover',
  },
];
