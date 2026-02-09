NAME = netsnap
VERSION = $(shell node -p "require('./package.json').version")
DIST_DIR = dist
ZIP_FILE = $(DIST_DIR)/$(NAME)-$(VERSION).zip

SRC_FILES = manifest.json background.js devtools.html devtools.js \
            popup.html popup.js popup.css utils.js icons/

.PHONY: test package clean

test:
	npx vitest run

package: clean test
	mkdir -p $(DIST_DIR)
	zip -r $(ZIP_FILE) $(SRC_FILES)
	@echo "Created $(ZIP_FILE)"

clean:
	rm -rf $(DIST_DIR)
