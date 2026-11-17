#!/usr/bin/env bash
# build.sh — rebuild dist/ from the pinned Luau, or check dist/ against the pin.
#
# This is the only place emscripten is reached, and the only time it is reached is when
# pin.txt changes. `--check` is what a dev loop and CI run: it compares the committed
# dist/ artifacts against the hashes recorded in pin.txt and answers in one line.
#
# Requirements for an actual build (none for --check): emcc + emcmake + cmake + ninja,
# and network once to clone vendor/luau at the pinned tag. On Termux the `pkg install
# emscripten` build works; on CI, `github.com/emsdk` as an action is the normal way —
# or just commit the rebuilt dist/ from any machine and land it.
set -euo pipefail
cd "$(dirname "$0")"

PIN_FILE=pin.txt
fail() { echo "luau-runtime build: $*" >&2; exit 1; }

recorded_tag=$(awk -F' = ' '/^tag = /{print $2}' "$PIN_FILE")
recorded_commit=$(awk -F' = ' '/^commit = /{print $2}' "$PIN_FILE")

if [[ "${1:-}" == "--check" ]]; then
	[[ -f dist/luau.wasm && -f dist/luau.mjs ]] || fail "dist/ luau artifacts are missing"
	[[ -f dist/luau-analysis.wasm && -f dist/luau-analysis.mjs ]] ||
		fail "dist/ analysis artifacts are missing"
	for artifact in luau.wasm luau.mjs luau-analysis.wasm luau-analysis.mjs; do
		want=$(sed -n "s|^# artifact ${artifact} = ||p" "$PIN_FILE")
		[[ -n "$want" ]] || fail "$PIN_FILE records no hash for $artifact"
		have=$(sha256sum "dist/$artifact" | cut -d' ' -f1)
		[[ "$want" == "$have" ]] || fail "dist/$artifact does not match $PIN_FILE ($have != $want)"
	done
	# **And the artifacts must be committed, not merely present.** The README's promise is
	# that a fresh clone runs the tests and the app without emscripten; ignored `dist/`
	# builds fine on the machine that ran the build and is absent from every clone — which
	# is exactly how this check came to exist. Only meaningful inside a work tree; a
	# release tarball has no git and is not making this promise.
	if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
		for artifact in dist/luau.wasm dist/luau.mjs dist/luau-analysis.wasm dist/luau-analysis.mjs dist/luau.d.mts dist/luau-analysis.d.mts; do
			git ls-files --error-unmatch "$artifact" >/dev/null 2>&1 ||
				fail "$artifact is not tracked by git — a fresh clone would not have it"
		done
	fi
	echo "luau-runtime: dist/ matches $PIN_FILE (luau $recorded_tag, $recorded_commit)"
	exit 0
fi

# The source must be exactly the pin. Clone it if it is absent; refuse if it differs.
if [[ ! -d vendor/luau ]]; then
	echo "cloning luau $recorded_tag at $recorded_commit..."
	git clone --depth 1 --branch "$recorded_tag" \
		https://github.com/luau-lang/luau vendor/luau
fi
actual_commit=$(git -C vendor/luau rev-parse HEAD)
[[ "$actual_commit" == "$recorded_commit" ]] ||
	fail "vendor/luau is at $actual_commit but $PIN_FILE pins $recorded_commit"

command -v emcmake >/dev/null || fail "emcmake not found — see the header comment"

mkdir -p build
cd build
emcmake cmake ../glue \
	-DCMAKE_BUILD_TYPE=Release \
	-DLUAU_PINNED_TAG="$recorded_tag" \
	-DLUAU_PINNED_COMMIT="$recorded_commit" \
	-G Ninja
cmake --build .

mkdir -p ../dist
# Both targets are built by the same cmake invocation: the analysis target is a
# sibling executable, not a second build tree, and it links Analysis only.
cp luau.mjs luau.wasm luau-analysis.mjs luau-analysis.wasm ../dist/
cd ..

# Record all four hashes so --check can hold the tree to them.
for artifact in luau.wasm luau.mjs luau-analysis.wasm luau-analysis.mjs; do
	hash=$(sha256sum "dist/$artifact" | cut -d' ' -f1)
	line="# artifact ${artifact} = ${hash}"
	if grep -q "^# artifact ${artifact} = " "$PIN_FILE"; then
		sed -i "s|^# artifact ${artifact} = .*|${line}|" "$PIN_FILE"
	else
		printf '%s\n' "${line}" >> "$PIN_FILE"
	fi
done

echo "luau $recorded_tag built; dist/luau.wasm $(wc -c <dist/luau.wasm) bytes," \
	"$(gzip -9 -c dist/luau.wasm | wc -c) gzipped; dist/luau-analysis.wasm $(wc -c <dist/luau-analysis.wasm) bytes," \
	"$(gzip -9 -c dist/luau-analysis.wasm | wc -c) gzipped. pin.txt updated."