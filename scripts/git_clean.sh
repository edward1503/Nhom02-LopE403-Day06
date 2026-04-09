#!/bin/bash
# Script to remove already tracked files that should be ignored by .gitignore

echo "Removing __pycache__ and other ignored files from Git index..."

# Remove everything from the index (not the disk)
git rm -r --cached .

# Re-add everything. Files matching .gitignore will stay out.
git add .

echo "Done! Files are now correctly ignored according to .gitignore."
echo "Please commit these changes to finalize the fix."
