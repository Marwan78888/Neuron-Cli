# Neuron CLI

This launcher installs a `neuron` command and downloads the Neuron repo locally.

## Start

```bash
neuron start
```

## Install

Install from this repository:

```bash
bash ./install.sh
```

Hosted install:

```bash
curl -fsSL https://raw.githubusercontent.com/Marwan78888/Neuron-Cli/main/install.sh | bash
```

## Repo Path

By default the launcher points to the installed local repo copy under:

```bash
$HOME/.local/share/neuron-cli/repo
```

You can override it with:

```bash
NEURON_PROJECT_PATH=/some/other/path neuron start
```
