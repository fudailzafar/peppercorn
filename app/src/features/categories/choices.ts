/** The colours a category can have, with names for screen readers. */
export const COLOURS: readonly (readonly [hex: string, name: string])[] = [
  ['#279AF4', 'Blue'],
  ['#FE724E', 'Orange'],
  ['#B1638B', 'Plum'],
  ['#D364FE', 'Orchid'],
  ['#6A7CF9', 'Indigo'],
  ['#FDBC3B', 'Amber'],
  ['#FF78A3', 'Pink'],
  ['#FDD011', 'Yellow'],
  ['#F73C60', 'Crimson'],
  ['#23CAFF', 'Cyan'],
  ['#7B01FE', 'Violet'],
  ['#FE6663', 'Coral'],
  ['#77B6F1', 'Sky blue'],
  ['#158AB1', 'Teal blue'],
  ['#B0D7FE', 'Pale blue'],
  ['#CD8A53', 'Brown'],
  ['#9DADFF', 'Lavender'],
  ['#6BB2AA', 'Sage teal'],
  ['#FDD27D', 'Cream'],
  ['#859977', 'Olive'],
  ['#FEAB84', 'Peach'],
  ['#244C7F', 'Navy'],
  ['#3BB19F', 'Teal'],
  ['#E3667E', 'Rose'],
  ['#9EC983', 'Light green'],
];

/** The first choice for income. */
export const MINT = ['#76FBB1', 'Mint'] as const;

/** Black or white, whichever can be read on a colour. */
export function inkOn(hex: string): '#000000' | '#FFFFFF' {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const part = parseInt(hex.slice(i, i + 2), 16) / 255;
    return part <= 0.03928 ? part / 12.92 : ((part + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.35 ? '#000000' : '#FFFFFF';
}

/** By what they are for: food, travel, shopping, home, fun, health, money, people, and the rest. */
export const EMOJIS: readonly string[] = [
  '🍔 🍕 🍣 🍜 🥗 🍩 ☕️ 🍺 🍷 🛒 🥑 🍎',
  '🚌 🚗 🚕 🚇 ✈️ ⛽️ 🚲 🛵 🚢 🅿️ 🚆 🛫',
  '🛍️ 👕 👟 👜 💄 🎁 📱 💻 🎧 📚 🧸 ⌚️',
  '🧾 💡 💧 🔥 📶 🏠 🔧 🧹 🛋️ 🔑 📦 🧴',
  '🎬 🎮 🎵 🎤 🎟️ 🎨 🎳 🏖️ 🎡 🎲 📺 🎸',
  '💊 🏥 🏋️ 🧘 🦷 👓 🩺 🧬 🛁 💈 🌿 🩹',
  '💼 💰 💵 💳 🏦 📈 🪙 💸 🤝 🏆 🧑‍💻 🎓',
  '🐶 🐱 👶 👨‍👩‍👧 💍 🎂 🎄 ❤️ 🌍 ⚽️ 🏀 🎾',
  '😄 😎 🤓 🥳 🙈 🌈 ⭐️ 🔔 ✏️ 📝 🧳 📷',
].flatMap((line) => line.split(' '));
