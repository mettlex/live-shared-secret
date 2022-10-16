#!/bin/bash

../emsdk/upstream/emscripten/emcc --no-entry -O3 -s WASM=1 -s EXPORT_ES6=1 -s SINGLE_FILE=1 -s MODULARIZE=1 -s EXPORT_NAME=\"Wrapper\" -s EXTRA_EXPORTED_RUNTIME_METHODS=["cwrap"] -I ../sss wrapper.c ../sss/hazmat.c ../sss/tweetnacl.c ../sss/sss.c randombytes.c  -o sss.js