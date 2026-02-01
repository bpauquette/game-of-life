package main

import (
	"fmt"
	"io/ioutil"
	"os"
	"path/filepath"
	"time"
)

func main() {
	repoPath := `C:\Users\bryan\repos\game-of-life`
	srcPath := `C:\Users\bryan\repos\game-of-life\src`
	os.Chdir(repoPath)

	seen := make(map[string]bool)
	fmt.Println("Watching for new build error files...")
	for {
		// Find all build-error-*.txt files
		files, _ := filepath.Glob("build-error-*.txt")
		for _, f := range files {
			if !seen[f] {
				seen[f] = true
				fmt.Println("New build error file detected:", f)
				data, _ := ioutil.ReadFile(f)
				fmt.Println(string(data)) // Here you would trigger Copilot or your fix logic
			}
		}
		time.Sleep(2 * time.Second)
	}
}
