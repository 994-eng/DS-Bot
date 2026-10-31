.PHONY: build test-extensions

build:
	sh scripts/build.sh

test-extensions:
	node --test extensions/*/test/*.test.js app/test/virtual-screens.test.mjs
