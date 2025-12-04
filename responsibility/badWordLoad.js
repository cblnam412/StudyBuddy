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
        try {
            if (!fs.existsSync(this.filePath)) {
                fs.writeFileSync(this.filePath, "", "utf-8");
                return;
            }

            const content = fs.readFileSync(this.filePath, "utf-8");
            const word = content.split(/\r?\n/);

            let count = 0;
            word.forEach((w) => {
                const cleanWord = w.trim().toLowerCase();
                if (cleanWord) {
                    this.badWords.add(cleanWord);
                }
            });

        } catch (error) {
            console.error("Error loading bad words:", error);
        }
   }

   addWord(word) {
        const cleanWord = word.trim().toLowerCase();
        if (cleanWord && !this.badWords.has(cleanWord)) {
            this.badWords.add(cleanWord);
            
            try {
                fs.appendFileSync(this.filePath, `\n${cleanWord}`, "utf-8");
                console.log(`[Dictionary] Added new word: "${cleanWord}"`);
            } catch (error) {
                console.error("[Dictionary] Error writing word:", error);
            }
        }
    }

    removeWord(word) {
        const cleanWord = word.trim().toLowerCase();
        
        if (this.badWords.has(cleanWord)) {
            this.badWords.delete(cleanWord);

            try {
                const newContent = Array.from(this.badWords).join("\n");
                fs.writeFileSync(this.filePath, newContent, "utf-8");
                console.log(`[Dictionary] Removed word: "${cleanWord}"`);
            } catch (error) {
                console.error("[Dictionary] Error removing word:", error);
            }
        } else {
            console.log(`[Dictionary] Word "${cleanWord}" not found.`);
        }
    }

   has(word) {
        return this.badWords.has(word.trim().toLowerCase());    
   }
}

export const dictionary = new BadWordDictionary();