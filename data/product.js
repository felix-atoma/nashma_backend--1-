const products = [
  {
    name: 'Yam Tubers',
    description: 'Clean, fresh Ghanaian yams.',
    price: 25,
    countInStock: 100,
    image: 'https://via.placeholder.com/150'
  },
  {
    name: 'Palm Oil',
    description: 'Pure, organic palm oil for cooking and cosmetics.',
    price: 18,
    countInStock: 200,
    image: 'https://via.placeholder.com/150'
  },
  {
    name: 'Black Soap',
    description: 'Traditional African black soap for healthy skin.',
    price: 10,
    countInStock: 150,
    image: 'https://via.placeholder.com/150'
  },
  {
    name: 'Plantain Chips',
    description: 'Crispy fried plantain chips, 500g pack.',
    price: 8,
    countInStock: 120,
    image: 'https://via.placeholder.com/150'
  },
  {
    name: 'Jollof Rice Mix',
    description: 'Authentic Jollof rice seasoning mix.',
    price: 12,
    countInStock: 80,
    image: 'https://via.placeholder.com/150'
  },
  {
    name: 'Shea Butter',
    description: 'Raw, unrefined shea butter for skin care.',
    price: 15,
    countInStock: 90,
    image: 'https://via.placeholder.com/150'
  },
  {
    name: 'Kente Cloth',
    description: 'Handwoven traditional Kente fabric (2 yards).',
    price: 45,
    countInStock: 30,
    image: 'https://via.placeholder.com/150'
  },
  {
    name: 'Groundnut Paste',
    description: 'Smooth peanut butter, 500g jar.',
    price: 9,
    countInStock: 110,
    image: 'https://via.placeholder.com/150'
  },
  {
    name: 'Dried Fish',
    description: 'Sun-dried tilapia, perfect for soups.',
    price: 20,
    countInStock: 60,
    image: 'https://via.placeholder.com/150'
  },
  {
    name: 'Baobab Powder',
    description: 'Organic baobab fruit powder, rich in vitamin C.',
    price: 22,
    countInStock: 45,
    image: 'https://via.placeholder.com/150'
  },
  {
    name: 'Fufu Powder',
    description: 'Instant fufu mix, 1kg package.',
    price: 14,
    countInStock: 75,
    image: 'https://via.placeholder.com/150'
  },
  {
    name: 'African Print Fabric',
    description: 'Colorful Ankara fabric (6 yards).',
    price: 35,
    countInStock: 50,
    image: 'https://via.placeholder.com/150'
  },
  {
    name: 'Palm Wine',
    description: 'Traditional fermented palm wine, 750ml.',
    price: 18,
    countInStock: 40,
    image: 'https://via.placeholder.com/150'
  },
  {
    name: 'Bissap Tea',
    description: 'Hibiscus flower tea leaves, 200g pack.',
    price: 11,
    countInStock: 65,
    image: 'https://via.placeholder.com/150'
  },
  {
    name: 'Cassava Flour',
    description: 'Premium grade cassava flour, 2kg.',
    price: 16,
    countInStock: 85,
    image: 'https://via.placeholder.com/150'
  },
  {
    name: 'Suya Spice Mix',
    description: 'Authentic Nigerian suya seasoning blend.',
    price: 13,
    countInStock: 55,
    image: 'https://via.placeholder.com/150'
  },
  {
    name: 'Wooden Mortar & Pestle',
    description: 'Traditional wooden set for pounding fufu.',
    price: 28,
    countInStock: 25,
    image: 'https://via.placeholder.com/150'
  },
  {
    name: 'Moringa Powder',
    description: 'Organic moringa leaf powder, 250g.',
    price: 19,
    countInStock: 70,
    image: 'https://via.placeholder.com/150'
  },
  {
    name: 'Pito (Millet Beer)',
    description: 'Traditional fermented millet drink, 1L.',
    price: 15,
    countInStock: 35,
    image: 'https://via.placeholder.com/150'
  },
  {
    name: 'Kola Nuts',
    description: 'Fresh bitter kola nuts, 200g pack.',
    price: 12,
    countInStock: 45,
    image: 'https://via.placeholder.com/150'
  },
  {
    name: 'Clay Cooking Pot',
    description: 'Traditional earthenware pot for stews.',
    price: 32,
    countInStock: 20,
    image: 'https://via.placeholder.com/150'
  },
  {
    name: 'Garden Egg',
    description: 'Fresh African garden eggs, 1kg.',
    price: 7,
    countInStock: 90,
    image: 'https://via.placeholder.com/150'
  },
  {
    name: 'Tiger Nut Drink',
    description: 'Ready-to-drink kunu aya, 500ml.',
    price: 10,
    countInStock: 60,
    image: 'https://via.placeholder.com/150'
  },
  {
    name: 'Attieke',
    description: 'Fermented cassava couscous, 1kg pack.',
    price: 14,
    countInStock: 50,
    image: 'https://via.placeholder.com/150'
  },
  {
    name: 'African Black Pepper',
    description: 'Whole grains of paradise, 100g.',
    price: 16,
    countInStock: 40,
    image: 'https://via.placeholder.com/150'
  },
  {
    name: 'Palm Nut Cream',
    description: 'Concentrated palm fruit extract, 500g.',
    price: 17,
    countInStock: 30,
    image: 'https://via.placeholder.com/150'
  },
  {
    name: 'Kenkey',
    description: 'Fermented corn dough, 5-pack.',
    price: 12,
    countInStock: 45,
    image: 'https://via.placeholder.com/150'
  },
  {
    name: 'African Breadfruit',
    description: 'Ukwa seeds, 500g pack.',
    price: 21,
    countInStock: 25,
    image: 'https://via.placeholder.com/150'
  },
  {
    name: 'Bambara Beans',
    description: 'Organic Bambara groundnuts, 1kg.',
    price: 15,
    countInStock: 35,
    image: 'https://via.placeholder.com/150'
  },
  {
    name: 'Scent Leaf (Nchanwu)',
    description: 'Fresh Ocimum gratissimum leaves.',
    price: 6,
    countInStock: 80,
    image: 'https://via.placeholder.com/150'
  },
  {
    name: 'Cocoyam',
    description: 'Fresh taro roots, 1kg.',
    price: 11,
    countInStock: 60,
    image: 'https://via.placeholder.com/150'
  },
  {
    name: 'Egusi Seeds',
    description: 'Ground melon seeds, 500g.',
    price: 13,
    countInStock: 50,
    image: 'https://via.placeholder.com/150'
  },
  {
    name: 'Palm Wine Vinegar',
    description: 'Traditional vinegar from palm wine.',
    price: 14,
    countInStock: 30,
    image: 'https://via.placeholder.com/150'
  },
  {
    name: 'African Nutmeg',
    description: 'Whole Ehuru seeds, 100g.',
    price: 18,
    countInStock: 40,
    image: 'https://via.placeholder.com/150'
  },
  {
    name: 'Bitter Leaf',
    description: 'Washed and prepared Vernonia leaves.',
    price: 8,
    countInStock: 70,
    image: 'https://via.placeholder.com/150'
  },
  {
    name: 'Dawadawa',
    description: 'Fermented locust bean seasoning cubes.',
    price: 10,
    countInStock: 45,
    image: 'https://via.placeholder.com/150'
  },
  {
    name: 'Clay Drinking Cup',
    description: 'Traditional calabash-shaped cup.',
    price: 15,
    countInStock: 25,
    image: 'https://via.placeholder.com/150'
  },
  {
    name: 'African Star Apple',
    description: 'Fresh agbalumo fruits, 1kg.',
    price: 12,
    countInStock: 40,
    image: 'https://via.placeholder.com/150'
  },
  {
    name: 'Palm Kernel Oil',
    description: '100% pure palm kernel oil, 500ml.',
    price: 20,
    countInStock: 30,
    image: 'https://via.placeholder.com/150'
  },
  {
    name: 'Ampesi Mix',
    description: 'Dehydrated yam and plantain mix.',
    price: 16,
    countInStock: 35,
    image: 'https://via.placeholder.com/150'
  },
  {
    name: 'African Walnuts',
    description: 'Shelled Tetracarpidium nuts, 250g.',
    price: 19,
    countInStock: 25,
    image: 'https://via.placeholder.com/150'
  },
  {
    name: 'Pepper Soup Mix',
    description: 'Blend of traditional soup spices.',
    price: 11,
    countInStock: 55,
    image: 'https://via.placeholder.com/150'
  },
  {
    name: 'Clay Grinding Bowl',
    description: 'Traditional earthenware for grinding.',
    price: 24,
    countInStock: 15,
    image: 'https://via.placeholder.com/150'
  },
  {
    name: 'African Honey',
    description: 'Raw, unprocessed wild honey, 500g.',
    price: 22,
    countInStock: 30,
    image: 'https://via.placeholder.com/150'
  },
  {
    name: 'Dried Okra',
    description: 'Sun-dried okra for soups, 200g.',
    price: 9,
    countInStock: 60,
    image: 'https://via.placeholder.com/150'
  },
  {
    name: 'Palm Frond Broom',
    description: 'Traditional handwoven broom.',
    price: 13,
    countInStock: 40,
    image: 'https://via.placeholder.com/150'
  },
  {
    name: 'African Eggplant',
    description: 'Fresh garden eggs, 1kg.',
    price: 10,
    countInStock: 50,
    image: 'https://via.placeholder.com/150'
  },
  {
    name: 'Soya Khebab',
    description: 'Ready-to-grill soya sticks, 10-pack.',
    price: 15,
    countInStock: 35,
    image: 'https://via.placeholder.com/150'
  },
  {
    name: 'Atama Soup Mix',
    description: 'Traditional Efik soup ingredients.',
    price: 17,
    countInStock: 25,
    image: 'https://via.placeholder.com/150'
  },
  {
    name: 'Palm Sugar',
    description: 'Unrefined sugar from palm sap, 500g.',
    price: 14,
    countInStock: 30,
    image: 'https://via.placeholder.com/150'
  },
  {
    name: 'African Bush Mango',
    description: 'Dried Irvingia nuts, 250g.',
    price: 20,
    countInStock: 20,
    image: 'https://via.placeholder.com/150'
  }
];

module.exports = products;