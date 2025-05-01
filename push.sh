#!/bin/bash

# push.sh - A script to push changes to GitHub with conventional commit messages including emojis

echo "Select the type of conventional commit:"
echo "1) feat: ✨  (A new feature)"
echo "2) fix: 🐛  (A bug fix)"
echo "3) docs: 📝  (Documentation only changes)"
echo "4) style: 💄  (Changes that do not affect the meaning of the code)"
echo "5) refactor: ♻️  (A code change that neither fixes a bug nor adds a feature)"
echo "6) test: ✅  (Adding missing tests or correcting existing tests)"
echo "7) chore: 🔧  (Changes to the build process or auxiliary tools)"

read -p "Enter your choice [1-7]: " choice

case $choice in
  1) type="feat"; emoji="✨" ;;
  2) type="fix"; emoji="🐛" ;;
  3) type="docs"; emoji="📝" ;;
  4) type="style"; emoji="💄" ;;
  5) type="refactor"; emoji="♻️" ;;
  6) type="test"; emoji="✅" ;;
  7) type="chore"; emoji="🔧" ;;
  *) echo "Invalid choice"; exit 1 ;;
esac

read -p "Enter the commit message: " message

if [ -z "$message" ]; then
  echo "Commit message cannot be empty."
  exit 1
fi

commit_msg="$emoji $type: $message"

echo "Running git add -A"
git add -A

echo "Committing with message: $commit_msg"
git commit -m "$commit_msg"

echo "Pushing to origin"
git push origin

echo "Done."
