#!/bin/bash

# Directory paths
SRC_DIR="controller"
DEST_DIR="ai_training_set"

# Create destination directory if it doesn't exist
mkdir -p "$DEST_DIR"

# Function to add comment based on file extension
add_comment() {
    local file="$1"
    local rel_path="$2"
    local ext="${file##*.}"
    local comment_prefix=""
    
    case "$ext" in
        js|ts|jsx|tsx)
            comment_prefix="//"
            ;;
        py)
            comment_prefix="#"
            ;;
        rb)
            comment_prefix="#"
            ;;
        php)
            comment_prefix="//"
            ;;
        css|scss|less)
            comment_prefix="/*"
            ;;
        html)
            comment_prefix="<!--"
            ;;
        *)
            comment_prefix="#"
            ;;
    esac

    # Create target directory
    mkdir -p "$(dirname "$DEST_DIR/$rel_path")"
    
    if [ "$ext" = "css" ] || [ "$ext" = "scss" ] || [ "$ext" = "less" ]; then
        # For CSS-like files, add comment with closing syntax
        echo "$comment_prefix $rel_path */" > "$DEST_DIR/$rel_path"
    elif [ "$ext" = "html" ]; then
        # For HTML files, add comment with closing syntax
        echo "$comment_prefix $rel_path -->" > "$DEST_DIR/$rel_path"
    else
        # For other files, add simple comment
        echo "$comment_prefix $rel_path" > "$DEST_DIR/$rel_path"
    fi
    
    # Append original content
    cat "$file" >> "$DEST_DIR/$rel_path"
}

# Find all files in source directory and process them
find "$SRC_DIR" -type f | while read -r file; do
    # Get relative path
    rel_path="${file#$SRC_DIR/}"
    
    # Add comment and copy file
    add_comment "$file" "$rel_path"
    
    echo "Processed: $rel_path"
done

echo "Done! Files copied to $DEST_DIR with path comments added."