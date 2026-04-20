#!/usr/bin/env bash
set -euo pipefail

# ╔══════════════════════════════════════════════════════════════════╗
# ║                    NEURON CLI — INSTALLER                        ║
# ╚══════════════════════════════════════════════════════════════════╝

# ========= Config =========
OWNER="${NEURON_REPO_OWNER:-Marwan78888}"
REPO="${NEURON_REPO_NAME:-Neuron-Cli}"
BRANCH="${NEURON_REPO_BRANCH:-main}"
NEURON_VERSION="1.0.0"

INSTALL_HOME="${HOME}/.local/share/neuron-cli"
REPO_DIR="${INSTALL_HOME}/repo"
LAUNCHER_DIR="${INSTALL_HOME}"
BIN_DIR="${HOME}/.local/bin"
CONFIG_DIR="${HOME}/.config/neuron"
CONFIG_FILE="${CONFIG_DIR}/launcher.env"
ARCHIVE_URL="https://github.com/${OWNER}/${REPO}/archive/refs/heads/${BRANCH}.tar.gz"
LOG_FILE="/tmp/neuron-install-$(date +%s).log"

# ========= Terminal Capability =========
TERM_WIDTH=$(tput cols 2>/dev/null || echo 72)
[ "$TERM_WIDTH" -gt 80 ] && TERM_WIDTH=80

# ========= Colors & Styles =========
BOLD="\033[1m"
DIM="\033[2m"
ITALIC="\033[3m"
RESET="\033[0m"

# Palette — electric cyan accent on deep charcoal
C_BG=""          # transparent bg, terminal owns it
C_ACCENT="\033[38;5;51m"        # electric cyan
C_ACCENT2="\033[38;5;45m"       # bright sky blue
C_SUCCESS="\033[38;5;82m"       # vivid lime green
C_WARN="\033[38;5;214m"         # amber
C_ERROR="\033[38;5;196m"        # vivid red
C_DIM="\033[38;5;240m"          # medium gray
C_WHITE="\033[38;5;255m"        # near white
C_MUTED="\033[38;5;245m"        # muted text
C_BORDER="\033[38;5;237m"       # subtle border gray
C_TITLE="\033[38;5;51m"         # same as accent for title

# ========= State =========
STEPS_TOTAL=6
STEP_CURRENT=0
START_TIME=$(date +%s)

# ========= Helpers =========

# Clear screen and show header
show_header() {
  clear
  local w=$TERM_WIDTH
  local inner=$((w - 2))

  # Top border
  printf "${C_BORDER}╔"
  printf '═%.0s' $(seq 1 $inner)
  printf "╗${RESET}\n"

  # Logo block
  printf "${C_BORDER}║${RESET}%*s${C_BORDER}║${RESET}\n" $inner ""

  # ASCII wordmark — centered
  local logo="  ███╗   ██╗███████╗██╗   ██╗██████╗  ██████╗ ███╗   ██╗  "
  local pad=$(( (inner - ${#logo}) / 2 ))
  printf "${C_BORDER}║${RESET}"
  printf "%${pad}s" ""
  printf "${C_ACCENT}${BOLD}%s${RESET}" "$logo"
  printf "%${pad}s" ""
  printf "${C_BORDER}║${RESET}\n"

  local logo2=" ████╗  ██║██╔════╝██║   ██║██╔══██╗██╔═══██╗████╗  ██║ "
  pad=$(( (inner - ${#logo2}) / 2 ))
  printf "${C_BORDER}║${RESET}"
  printf "%${pad}s" ""
  printf "${C_ACCENT2}${BOLD}%s${RESET}" "$logo2"
  printf "%${pad}s" ""
  printf "${C_BORDER}║${RESET}\n"

  local logo3=" ██╔██╗ ██║█████╗  ██║   ██║██████╔╝██║   ██║██╔██╗ ██║ "
  pad=$(( (inner - ${#logo3}) / 2 ))
  printf "${C_BORDER}║${RESET}"
  printf "%${pad}s" ""
  printf "${C_ACCENT}${BOLD}%s${RESET}" "$logo3"
  printf "%${pad}s" ""
  printf "${C_BORDER}║${RESET}\n"

  local logo4=" ██║╚██╗██║██╔══╝  ██║   ██║██╔══██╗██║   ██║██║╚██╗██║ "
  pad=$(( (inner - ${#logo4}) / 2 ))
  printf "${C_BORDER}║${RESET}"
  printf "%${pad}s" ""
  printf "${C_ACCENT2}${BOLD}%s${RESET}" "$logo4"
  printf "%${pad}s" ""
  printf "${C_BORDER}║${RESET}\n"

  local logo5=" ██║ ╚████║███████╗╚██████╔╝██║  ██║╚██████╔╝██║ ╚████║ "
  pad=$(( (inner - ${#logo5}) / 2 ))
  printf "${C_BORDER}║${RESET}"
  printf "%${pad}s" ""
  printf "${C_ACCENT}${BOLD}%s${RESET}" "$logo5"
  printf "%${pad}s" ""
  printf "${C_BORDER}║${RESET}\n"

  printf "${C_BORDER}║${RESET}%*s${C_BORDER}║${RESET}\n" $inner ""

  # Tagline
  local tag="  Command-Line Intelligence  ·  v${NEURON_VERSION}  "
  pad=$(( (inner - ${#tag}) / 2 ))
  printf "${C_BORDER}║${RESET}"
  printf "%${pad}s" ""
  printf "${C_MUTED}${ITALIC}%s${RESET}" "$tag"
  printf "%${pad}s" ""
  printf "${C_BORDER}║${RESET}\n"

  printf "${C_BORDER}║${RESET}%*s${C_BORDER}║${RESET}\n" $inner ""

  # Bottom border
  printf "${C_BORDER}╚"
  printf '═%.0s' $(seq 1 $inner)
  printf "╝${RESET}\n"
  echo
}

# Horizontal rule
hr() {
  local char="${1:-─}"
  printf "${C_BORDER}"
  printf "${char}%.0s" $(seq 1 $TERM_WIDTH)
  printf "${RESET}\n"
}

# Section label
section() {
  local label="$1"
  echo
  printf " ${C_ACCENT}▸${RESET} ${C_WHITE}${BOLD}%s${RESET}\n" "$label"
  printf "   ${C_DIM}"
  printf '·%.0s' $(seq 1 $((TERM_WIDTH - 4)))
  printf "${RESET}\n"
}

# Step tracker with overall progress bar
step() {
  STEP_CURRENT=$((STEP_CURRENT + 1))
  local label="$1"
  local pct=$(( STEP_CURRENT * 100 / STEPS_TOTAL ))
  local bar_width=$((TERM_WIDTH - 16))
  local filled=$(( pct * bar_width / 100 ))
  local empty=$(( bar_width - filled ))

  # Move to bottom area — just print inline
  echo
  printf " ${C_DIM}STEP %d/%d${RESET}  ${C_WHITE}${BOLD}%s${RESET}\n" \
    "$STEP_CURRENT" "$STEPS_TOTAL" "$label"

  # Progress bar
  printf " ${C_BORDER}[${RESET}"
  printf "${C_ACCENT}█%.0s${RESET}" $(seq 1 $filled)  2>/dev/null || true
  [ $filled -gt 0 ] && printf "${C_ACCENT}▓${RESET}"
  printf "${C_DIM}░%.0s${RESET}" $(seq 1 $((empty > 0 ? empty - 1 : 0))) 2>/dev/null || true
  printf "${C_BORDER}]${RESET} ${C_MUTED}%3d%%${RESET}\n" "$pct"
}

# Log message types
log()     { printf "   ${C_ACCENT}→${RESET}  ${C_WHITE}%s${RESET}\n"   "$1"; }
success() { printf "   ${C_SUCCESS}✔${RESET}  ${C_WHITE}%s${RESET}\n" "$1"; }
warn()    { printf "   ${C_WARN}⚠${RESET}  ${C_WARN}%s${RESET}\n"     "$1"; }
error()   { printf "   ${C_ERROR}✖${RESET}  ${C_ERROR}${BOLD}%s${RESET}\n" "$1"; }
detail()  { printf "   ${C_DIM}   %s${RESET}\n" "$1"; }

# Animated spinner with live label
spinner() {
  local pid=$1
  local label="${2:-Working...}"
  local frames=("⠋" "⠙" "⠹" "⠸" "⠼" "⠴" "⠦" "⠧" "⠇" "⠏")
  local i=0
  local elapsed=0
  tput civis 2>/dev/null || true   # hide cursor

  while kill -0 "$pid" 2>/dev/null; do
    local frame="${frames[$((i % ${#frames[@]}))]}"
    printf "\r   ${C_ACCENT}%s${RESET}  ${C_WHITE}%s${RESET}  ${C_DIM}(%ds)${RESET}   " \
      "$frame" "$label" "$elapsed"
    sleep 0.1
    i=$((i + 1))
    elapsed=$(( ($(date +%s) - START_TIME) ))
  done

  tput cnorm 2>/dev/null || true   # restore cursor
  printf "\r%*s\r" "$TERM_WIDTH" ""  # clear spinner line
}

# Check if command exists, print result
require() {
  local cmd="$1"
  local label="${2:-$1}"
  if command -v "$cmd" >/dev/null 2>&1; then
    local ver
    ver=$("$cmd" --version 2>/dev/null | head -1 | sed 's/[^0-9.]//g' | cut -d. -f1-3) || ver="?"
    success "${label} $(printf "${C_DIM}%s${RESET}" "($ver)")"
    return 0
  else
    return 1
  fi
}

# Elapsed time pretty-print
elapsed() {
  local secs=$(( $(date +%s) - START_TIME ))
  printf "%dm %02ds" $((secs / 60)) $((secs % 60))
}

# Fatal error screen
fatal() {
  echo
  hr "═"
  printf "\n ${C_ERROR}${BOLD}  INSTALLATION FAILED${RESET}\n\n"
  error "$1"
  echo
  printf "   ${C_DIM}Log file: %s${RESET}\n" "$LOG_FILE"
  printf "   ${C_DIM}Report issues: https://github.com/${OWNER}/${REPO}/issues${RESET}\n"
  echo
  hr "═"
  echo
  exit 1
}

# ========= SPLASH SCREEN =========
show_header

printf " ${C_DIM}  Source  ${RESET}${C_WHITE}${OWNER}/${REPO}${RESET}  ${C_DIM}@${RESET}  ${C_ACCENT}${BRANCH}${RESET}\n"
printf " ${C_DIM}  Target  ${RESET}${C_WHITE}${INSTALL_HOME}${RESET}\n"
printf " ${C_DIM}  Log     ${RESET}${C_WHITE}${LOG_FILE}${RESET}\n"
echo
hr

# ========= STEP 1 — Prepare directories =========
section "Preparing Environment"
step "Create directories"

mkdir -p "${INSTALL_HOME}" "${BIN_DIR}" "${CONFIG_DIR}"
log "Created install directories"
detail "${INSTALL_HOME}"
detail "${BIN_DIR}"
detail "${CONFIG_DIR}"
success "Directories ready"

# ========= STEP 2 — Check requirements =========
section "Checking Requirements"
step "Verify system dependencies"

command -v curl >/dev/null || fatal "curl is required but not found. Install it with your package manager."
command -v tar  >/dev/null || fatal "tar is required but not found."
command -v node >/dev/null || fatal "Node.js is required but not found. Visit https://nodejs.org"

require curl  "curl "
require tar   "tar  "
require node  "node "

# ========= STEP 3 — Install Bun (if missing) =========
section "Runtime: Bun"
step "Install Bun package manager"

if command -v bun >/dev/null 2>&1; then
  require bun "bun  "
else
  warn "Bun not found — installing now..."
  echo

  (curl -fsSL https://bun.sh/install | bash >> "$LOG_FILE" 2>&1) &
  spinner $! "Downloading Bun runtime"

  export BUN_INSTALL="${HOME}/.bun"
  export PATH="${BUN_INSTALL}/bin:${PATH}"

  if command -v bun >/dev/null 2>&1; then
    success "Bun installed successfully"
  else
    fatal "Bun installation failed. See log: ${LOG_FILE}"
  fi
fi

# ========= STEP 4 — Download =========
section "Fetching Source"
step "Download repository archive"

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "${TMP_DIR}"; tput cnorm 2>/dev/null || true' EXIT

log "Source: ${ARCHIVE_URL}"
echo

# Download with progress bar via curl
(curl -L --progress-bar "${ARCHIVE_URL}" \
  -o "${TMP_DIR}/repo.tar.gz" 2>&1 | tee -a "$LOG_FILE") \
  || fatal "Download failed. Check your internet connection."

echo
success "Archive downloaded"

# ========= STEP 5 — Extract & Install =========
section "Extracting & Installing"
step "Unpack and wire up CLI"

log "Extracting archive..."

(tar -xzf "${TMP_DIR}/repo.tar.gz" -C "${TMP_DIR}" >> "$LOG_FILE" 2>&1) &
spinner $! "Unpacking files"

EXTRACTED_DIR="${TMP_DIR}/${REPO}-${BRANCH}"
[ -d "${EXTRACTED_DIR}" ] || fatal "Extraction failed — expected directory not found."

rm -rf "${REPO_DIR}"
mkdir -p "${REPO_DIR}"
cp -R "${EXTRACTED_DIR}/." "${REPO_DIR}/"
success "Repository extracted"

# Clean up localized README translations - keep a single README.md
log "Removing localized README translations (keeping README.md)"
# Find any README.<lang>.md (case-insensitive) and delete, but keep README.md
find "${REPO_DIR}" -type f -iname 'readme.*.md' ! -iname 'readme.md' -print >> "$LOG_FILE" 2>&1 || true
find "${REPO_DIR}" -type f -iname 'readme.*.md' ! -iname 'readme.md' -delete 2>> "$LOG_FILE" || true
success "Localized README files cleaned"

# Install dependencies
log "Installing Node dependencies..."

(bun install --cwd "${REPO_DIR}" >> "$LOG_FILE" 2>&1) &
spinner $! "Resolving packages with Bun"

success "Dependencies installed"

# ========= STEP 6 — Wire launcher =========
section "Setting Up Launcher"
step "Configure binary & shell integration"

mkdir -p "${LAUNCHER_DIR}/bin"

# Validate source files exist
[ -f "${REPO_DIR}/neuron-cli/package.json" ] \
  || fatal "Missing package.json in repo — repository may be incomplete."
[ -f "${REPO_DIR}/neuron-cli/bin/neuron.js" ] \
  || fatal "Missing neuron.js binary in repo — repository may be incomplete."

cp "${REPO_DIR}/neuron-cli/package.json" "${LAUNCHER_DIR}/package.json"
cp "${REPO_DIR}/neuron-cli/bin/neuron.js" "${LAUNCHER_DIR}/bin/neuron.js"
chmod +x "${LAUNCHER_DIR}/bin/neuron.js"
detail "Launcher binary ready"

# Write shell wrapper
cat > "${BIN_DIR}/neuron" <<WRAPPER
#!/usr/bin/env bash
set -euo pipefail
# Neuron CLI — auto-generated by installer v${NEURON_VERSION}
exec node "${LAUNCHER_DIR}/bin/neuron.js" "\$@"
WRAPPER
chmod +x "${BIN_DIR}/neuron"
detail "Shell wrapper written → ${BIN_DIR}/neuron"

# Write config
cat > "${CONFIG_FILE}" <<CFG
# Neuron CLI configuration
# Generated: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
NEURON_VERSION="${NEURON_VERSION}"
NEURON_PROJECT_PATH="${REPO_DIR}"
NEURON_BRANCH="${BRANCH}"
CFG
detail "Config written → ${CONFIG_FILE}"

success "Launcher configured"

# ========= PATH integration =========
PATH_ADDED=false
case ":${PATH}:" in
  *":${BIN_DIR}:"*) ;;
  *)
    SHELL_RC="${HOME}/.zshrc"
    [[ "${SHELL:-}" == */bash ]] && SHELL_RC="${HOME}/.bashrc"

    if [ -f "${SHELL_RC}" ] && ! grep -Fq '.local/bin' "${SHELL_RC}"; then
      printf '\n# Added by Neuron CLI installer\nexport PATH="$HOME/.local/bin:$PATH"\n' \
        >> "${SHELL_RC}"
      PATH_ADDED=true
      warn "Added ~/.local/bin to PATH in ${SHELL_RC}"
      detail "Restart your terminal or run: source ${SHELL_RC}"
    fi
    ;;
esac

# ========= SUCCESS SCREEN =========
echo
echo
hr "═"

printf "\n"
printf "   ${C_SUCCESS}${BOLD}  ✔  Installation complete!${RESET}\n"
printf "\n"

# Info grid
printf "   ${C_DIM}  Version  ${RESET}${C_WHITE}${BOLD}v${NEURON_VERSION}${RESET}\n"
printf "   ${C_DIM}  Branch   ${RESET}${C_WHITE}${BRANCH}${RESET}\n"
printf "   ${C_DIM}  Location ${RESET}${C_WHITE}${INSTALL_HOME}${RESET}\n"
printf "   ${C_DIM}  Duration ${RESET}${C_WHITE}$(elapsed)${RESET}\n"
printf "\n"

hr

# Next steps
printf "\n"
printf "   ${C_ACCENT}${BOLD}Get started${RESET}\n\n"
printf "   ${C_DIM}$${RESET}  ${C_WHITE}${BOLD}neuron start${RESET}           ${C_DIM}# launch the CLI${RESET}\n"
printf "   ${C_DIM}$${RESET}  ${C_WHITE}${BOLD}neuron --help${RESET}          ${C_DIM}# show all commands${RESET}\n"

if $PATH_ADDED; then
  printf "\n"
  printf "   ${C_WARN}⚠  Restart your terminal for PATH changes to take effect.${RESET}\n"
fi

printf "\n"
hr "═"
printf "\n"

# Prompt the user to star the project (interactive only)
if [ -t 0 ] && [ -t 1 ]; then
  printf "\n   ${C_ACCENT}Would you like to open the GitHub page to star Neuron? (y/N) ${RESET}"
  read -r reply || reply="n"
  case "$reply" in
    [yY][eE][sS]|[yY])
      REPO_URL="https://github.com/${OWNER}/${REPO}"
      if command -v open >/dev/null 2>&1; then
        open "$REPO_URL" >/dev/null 2>&1 || true
      elif command -v xdg-open >/dev/null 2>&1; then
        xdg-open "$REPO_URL" >/dev/null 2>&1 || true
      else
        printf "\n   ${C_DIM}Open this URL in your browser to star the project: ${C_WHITE}%s${RESET}\n" "$REPO_URL"
      fi
      ;;
    *)
      printf "\n   ${C_DIM}No problem — you can star the project later at https://github.com/${OWNER}/${REPO}${RESET}\n"
      ;;
  esac
fi
