#!/bin/bash

deno run --watch --allow-net --allow-env --allow-read=./ --allow-write=./ server/main.ts --drop_tables=true
