package main

import (
	"fmt"
	"os"
	"os/exec"
)

func main() {
	repoPath := `C:\Users\bryan\repos\game-of-life`
	os.Chdir(repoPath)

	// Run build and capture output
	buildFile, _ := os.Create("build-error.txt")
	cmd := exec.Command("npm", "run", "build")
	cmd.Stdout = buildFile
	cmd.Stderr = buildFile
	err := cmd.Run()
	buildFile.Close()

	if err == nil {
		exec.Command("git", "add", ".").Run()
		exec.Command("git", "commit", "-m", "Auto-approve: build succeeded and changes applied").Run()
		exec.Command("git", "push").Run()
		fmt.Println("Build succeeded and changes committed.")
	} else {
		fmt.Println("Build failed. See build-error.txt for details.")
	}
}
