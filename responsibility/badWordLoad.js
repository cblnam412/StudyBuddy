import fs from "fs";
import path from "path";

class BadWordDictionary {
    constructor() {
        this.badWords = new Set(["lồn", "cc", "cặc", "đĩ"]);
        this.filePath = path.join(process.cwd(), "badWords.txt");
        this.loadWords();
    }

    loadWords() {
        //TODO: Thực hiện logic đọc file badWords.txt và nạp vào this.badWords 
   }

   addWord(word) {
        const cleanWord = word.trim().toLowerCase();
        if (!this.words.has(cleanWord)) {
            this.badWords.add(cleanWord);
            //TODO: Thực hiện logic ghi từ mới vào file badWords.txt
        }
   }

   has(word) {
        return this.badWords.has(word.trim().toLowerCase());    
   }
}

export const dictionary = new BadWordDictionary();