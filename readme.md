### Command-Line
--------------------------
Install Deno version 1.26.1 or newer. Linux or Unix system is required.

To run the command-line program:

```bash
cd cli/

deno run --unstable --no-remote --allow-read=./ --allow-write=./ one_time_setup.ts
```

#### Notes:
- `--unstable` flag is only required for [Deno.stdin.setRaw()](https://doc.deno.land/deno/stable/~/Deno.stdin)
- `--no-remote` to prevent downloading any code from the internet