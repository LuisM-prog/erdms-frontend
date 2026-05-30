// Format: Word + number + symbol (easy to read aloud)
const generatePassword = () => {
    const adjectives = ['Happy', 'Strong', 'Bright', 'Calm', 'Swift', 'Brave', 'Clever', 'Kind'];
    const nouns = ['Tiger', 'Eagle', 'River', 'Cloud', 'Stone', 'Flower', 'Star', 'Ocean'];
    const numbers = Math.floor(Math.random() * 900 + 100); // 3-digit number
    const symbols = ['!', '@', '#', '$', '%', '&', '?'];
    
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const symbol = symbols[Math.floor(Math.random() * symbols.length)];
    
    return `${adj}${noun}${numbers}${symbol}`;
};

export default generatePassword;