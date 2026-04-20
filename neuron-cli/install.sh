#!/usr/bin/env bash
set -euo pipefail

OWNER="${NEURON_REPO_OWNER:-Marwan78888}"
REPO="${NEURON_REPO_NAME:-Neuron-Cli}"
BRANCH="${NEURON_REPO_BRANCH:-main}"

INSTALL_HOME="${HOME}/.local/share/neuron-cli"
REPO_DIR="${INSTALL_HOME}/repo"
LAUNCHER_DIR="${INSTALL_HOME}"
BIN_DIR="${HOME}/.local/bin"
CONFIG_DIR="${HOME}/.config/neuron"
CONFIG_FILE="${CONFIG_DIR}/launcher.env"
ARCHIVE_URL="https://github.com/${OWNER}/${REPO}/archive/refs/heads/${BRANCH}.tar.gz"

mkdir -p "${INSTALL_HOME}" "${BIN_DIR}" "${CONFIG_DIR}"

if ! command -v curl >/dev/null 2>&1; then
  echo "curl is required to install Neuron."
  exit 1
fi

if ! command -v tar >/dev/null 2>&1; then
  echo "tar is required to install Neuron."
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required to run Neuron CLI."
  exit 1
fi

if ! command -v bun >/dev/null 2>&1; then
  echo "Bun not found. Installing Bun..."
  curl -fsSL https://bun.sh/install | bash
  export BUN_INSTALL="${HOME}/.bun"
  export PATH="${BUN_INSTALL}/bin:${PATH}"
fi

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "${TMP_DIR}"' EXIT

echo "Downloading Neuron from GitHub..."
curl -fsSL "${ARCHIVE_URL}" -o "${TMP_DIR}/repo.tar.gz"
tar -xzf "${TMP_DIR}/repo.tar.gz" -C "${TMP_DIR}"

EXTRACTED_DIR="${TMP_DIR}/${REPO}-${BRANCH}"
if [ ! -d "${EXTRACTED_DIR}" ]; then
  echo "Failed to extract repository archive."
  exit 1
fi

rm -rf "${REPO_DIR}"
mkdir -p "${REPO_DIR}"
cp -R "${EXTRACTED_DIR}/." "${REPO_DIR}/"

echo "Installing dependencies..."
bun install --cwd "${REPO_DIR}"

mkdir -p "${LAUNCHER_DIR}/bin"
cp "${REPO_DIR}/neuron-cli/package.json" "${LAUNCHER_DIR}/package.json"
cp "${REPO_DIR}/neuron-cli/bin/neuron.js" "${LAUNCHER_DIR}/bin/neuron.js"
chmod +x "${LAUNCHER_DIR}/bin/neuron.js"

cat > "${BIN_DIR}/neuron" <<EOF
#!/usr/bin/env bash
set -euo pipefail
exec node "${LAUNCHER_DIR}/bin/neuron.js" "\$@"
EOF
chmod +x "${BIN_DIR}/neuron"

cat > "${CONFIG_FILE}" <<EOF
NEURON_PROJECT_PATH="${REPO_DIR}"
EOF

case ":${PATH}:" in
  *":${BIN_DIR}:"*) ;;
  *)
    SHELL_RC="${HOME}/.zshrc"
    if [ -n "${SHELL:-}" ] && [[ "${SHELL}" == */bash ]]; then
      SHELL_RC="${HOME}/.bashrc"
    fi
    if [ -f "${SHELL_RC}" ] && ! grep -Fq 'export PATH="$HOME/.local/bin:$PATH"' "${SHELL_RC}"; then
      printf '\nexport PATH="$HOME/.local/bin:$PATH"\n' >> "${SHELL_RC}"
    fi
    ;;
esac

echo "Neuron CLI installed."
echo "Run: neuron start"
echo "Source repo: ${OWNER}/${REPO} (${BRANCH})"
