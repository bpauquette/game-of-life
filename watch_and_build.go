package main

import (
	"fmt"
	"io/ioutil"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

const (
	repoPath = `C:\Users\bryan\repos\game-of-life`
	srcPath  = `C:\Users\bryan\repos\game-of-life\src`
	goScript = `C:\Users\bryan\repos\game-of-life\autoapprove.go`
	errFile  = `C:\Users\bryan\repos\game-of-life\build-error.txt`
)

func getMtimes(root string) map[string]int64 {
	mtimes := make(map[string]int64)
	filepath.Walk(root, func(path string, info os.FileInfo, err error) error {
		if err == nil && !info.IsDir() && (strings.HasSuffix(path, ".js") || strings.HasSuffix(path, ".jsx") || strings.HasSuffix(path, ".ts") || strings.HasSuffix(path, ".tsx")) {
			mtimes[path] = info.ModTime().UnixNano()
		}
		return nil
	})
	return mtimes
}

func mtimesChanged(a, b map[string]int64) bool {
	if len(a) != len(b) {
		return true
	}
	for k, v := range a {
		if b[k] != v {
			return true
		}
	}
	return false
}

func showBuildError() {
	fmt.Println("\n=== Build failed! ===")
	data, err := ioutil.ReadFile(errFile)
	if err == nil {
		lines := strings.Split(string(data), "\n")
		start := 0
		if len(lines) > 30 {
			start = len(lines) - 30
		}
		for _, line := range lines[start:] {
			fmt.Println(line)
		}
		fmt.Println("\nCopy the error log above and paste it to Copilot for fixes.")
	} else {
		fmt.Println("Could not read build-error.txt.")
	}
}

func main() {
	os.Chdir(repoPath)
	lastMtimes := getMtimes(srcPath)
	fmt.Println("Watching for changes...")
	for {
		time.Sleep(2 * time.Second)
		mtimes := getMtimes(srcPath)
		if mtimesChanged(mtimes, lastMtimes) {
			fmt.Println("Change detected. Running build...")
			cmd := exec.Command("go", "run", goScript)
			cmd.Stdout = os.Stdout
			cmd.Stderr = os.Stderr
			cmd.Run()
			if fi, err := os.Stat(errFile); err == nil && fi.Size() > 0 {
				showBuildError()
			} else {
				fmt.Println("Build succeeded.")
			}
			lastMtimes = mtimes
		}
	}
}
