// Cute animal emojis for trip members
const ANIMAL_EMOJIS = [
  '🐼', '🐨', '🦊', '🦁', '🐯', '🐻', '🐰', '🐱', '🐶', '🐸', 
  '🐧', '🦆', '🦉', '🐺', '🦝', '🐮', '🐷', '🐹', '🐭', '🦘',
  '🦥', '🦦', '🦨', '🦫', '🦡', '🦔', '🐾', '🦭', '🐬', '🐋'
];

export const getRandomEmoji = () => {
  return ANIMAL_EMOJIS[Math.floor(Math.random() * ANIMAL_EMOJIS.length)];
};

export const getAllEmojis = () => {
  return [...ANIMAL_EMOJIS];
};

export const assignEmojiToMember = (member, existingEmojis = []) => {
  // If member already has an emoji, return it
  if (member.emoji) return member.emoji;
  
  // Get available emojis (not already assigned)
  const availableEmojis = ANIMAL_EMOJIS.filter(e => !existingEmojis.includes(e));
  
  // If no available emojis, use random
  if (availableEmojis.length === 0) {
    return getRandomEmoji();
  }
  
  // Assign random available emoji
  return availableEmojis[Math.floor(Math.random() * availableEmojis.length)];
};