<p align="center">
  <img src="assets/logo.png" alt="AWS Bedrock for Copilot" width="128" />
</p>

<h1 align="center">AWS Bedrock for Copilot</h1>

<p align="center">
  <a href="https://github.com/rangan2510/aws-bedrock-for-copilot/releases/latest"><img src="https://img.shields.io/github/v/release/rangan2510/aws-bedrock-for-copilot?label=release" alt="Latest Release" /></a>
  <a href="https://github.com/rangan2510/aws-bedrock-for-copilot/blob/main/LICENSE"><img src="https://img.shields.io/github/license/rangan2510/aws-bedrock-for-copilot" alt="License" /></a>
  <a href="https://github.com/rangan2510/aws-bedrock-for-copilot"><img src="https://img.shields.io/github/stars/rangan2510/aws-bedrock-for-copilot?style=social" alt="Stars" /></a>
</p>

This is a **friendly development fork** of [amazon-bedrock-copilot-chat](https://github.com/tinovyatkin/amazon-bedrock-copilot-chat) by [Konstantin Vyatkin (@tinovyatkin)](https://github.com/tinovyatkin). All the foundational work -- the provider architecture, streaming, authentication, message conversion -- is from the original project. This fork exists for quick bugfixes and enhancements while the upstream is less active, and runs **alongside** the upstream extension without conflicts. Changes here are intended to be upstreamable; PRs are offered back to the original repo when applicable. See [Credits](#credits) for more.

> **Important**: Models provided through the Language Model Chat Provider API are currently only available to users on **individual GitHub Copilot plans**. Organization plans are not yet supported.

## What this fork changes

Bugfixes and additions over upstream `v0.11.0`. CLI-verified against the live Bedrock Converse API.

**Newer Claude support**

- Opus 4.8 / 4.7: adaptive thinking, deprecated `temperature` handled, correct 1M / 128K limits
- Haiku 4.5: extended thinking enabled
- All Claude 4.x: thinking mode (adaptive vs enabled+budget) and effort levels (low / medium / high / xhigh / max) gated per model

**Other models**

- 80+ models across 14 providers wired up with verified tool-calling and vision profiles
- `reasoning_effort` (low / medium / high / minimal) for OpenAI gpt-oss, DeepSeek V3.2, Kimi K2.x, Qwen3, GLM, MiniMax
- Graceful fallback when a model returns unparseable tool JSON

**UX**

- Model picker shows capability summary inline (context, output, thinking mode, vision)
- LEGACY models prefixed with a warning glyph instead of being silently filtered
- Region setting is now a dropdown of known Bedrock regions

**Identity**

- Runs as the `aws-bedrock-for-copilot` vendor with its own config namespace, so it installs alongside the upstream `bedrock` extension without conflicts

**VS Code 1.116+ compatibility (May 2026)**

- Models now appear in the agent-mode model picker again. VS Code 1.116 introduced two proposed-API gates (`agentMode`, `isUserSelectable`) that hid every model from this extension; the fork sets both to `true` on every model entry.
- Long-running Claude streams (extended thinking >5 min) no longer fail with `BodyTimeoutError: terminated`. Switched the AWS SDK transport from `smithy-node-native-fetch` (Node's undici, hard-coded 5-minute body timeout) to `@smithy/node-http-handler` (Node's `http`/`https` modules) with `socketTimeout: 0` and 30-second TCP keep-alive packets to keep idle connections open through firewalls.

## Features

- **80+ Bedrock models**: All text-generation models with tool calling support, including Claude, Llama, Mistral, Qwen, DeepSeek, Kimi, GLM, Gemma, Nova, and more (see [Supported Models](#supported-models))
- **Flexible authentication**: AWS Profiles, API Keys (bearer tokens), or Access Keys -- all stored securely in VSCode SecretStorage
- **Streaming**: Real-time streaming responses via the Bedrock ConverseStream API
- **Tool calling**: Full function calling support, required for Copilot Chat features like `@workspace` and `@terminal`
- **Cross-region inference**: Automatic support for regional and global inference profiles
- **Extended thinking**: Automatic thinking configuration per model generation -- adaptive thinking for Opus 4.7/4.8, enabled+budget for older models, with configurable effort levels for supported models
- **1M context window**: Always-on 1M context for Opus 4.7/4.8; optional 1M for Opus 4.6 and Sonnet 4.6 (configurable in settings)
- **Prompt caching**: Automatic caching of system prompts, tool definitions, and conversation history (Claude and Nova models)
- **Vision**: Image input support for models that declare IMAGE modality

## Prerequisites

- Visual Studio Code version 1.104.0 or higher
- GitHub Copilot extension
- AWS credentials (AWS Profile, API Key, or Access Keys)
- Access to Amazon Bedrock in your AWS account

## Installation

1. Download the latest VSIX from this repo's releases (or build with `bun run vsce:package`)
2. Install: `code --install-extension dist/extension.vsix`
3. Configure your AWS credentials if you haven't already:
   - See [AWS CLI Configuration](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html) for details
4. Run the "Manage AWS Bedrock for Copilot" command to select your AWS profile and region

## Configuration

### Authentication Methods

This extension supports three authentication methods:

1. **AWS Profile** (recommended) - Uses named profiles from `~/.aws/credentials` and `~/.aws/config`
2. **API Key** - Uses [Amazon Bedrock API key](https://docs.aws.amazon.com/bedrock/latest/userguide/api-keys.html) (stored securely in VSCode SecretStorage)
3. **Access Keys** - Uses AWS access key ID and secret (stored securely in VSCode SecretStorage)

To configure:

1. Open the Command Palette (`Cmd+Shift+P` or `Ctrl+Shift+P`)
2. Run "Manage AWS Bedrock for Copilot"
3. Choose "Set Authentication Method" to select your preferred method
4. Follow the prompts to enter credentials
5. Choose "Set Region" to select your preferred AWS region

### Available Regions

The extension supports all AWS partitions including:

- **Commercial AWS** - All standard regions (us-east-1, eu-west-1, ap-southeast-2, etc.)
- **AWS GovCloud (US)** - us-gov-west-1, us-gov-east-1
- **AWS China** - cn-north-1, cn-northwest-1

See [Model support by AWS Region in Amazon Bedrock](https://docs.aws.amazon.com/bedrock/latest/userguide/models-regions.html) for the latest list of supported regions and [GOVCLOUD-COMPATIBILITY.md](./GOVCLOUD-COMPATIBILITY.md) for partition-specific details.

### Settings reference

All settings live under the `aws-bedrock-for-copilot` namespace. Vendor-specific knobs are grouped under their vendor.

| Setting | Default | Description |
| --- | --- | --- |
| `region` | `us-east-1` | AWS region for Bedrock calls (dropdown of known regions) |
| `profile` | _(unset)_ | Named profile from `~/.aws/credentials`; empty falls back to the default credential chain |
| `preferredModel` | _(unset)_ | Model ID Copilot should default to |
| `promptCaching.enabled` | `true` | Cache system prompts and tool definitions for Claude and Nova |
| `reasoningEffort` | `high` | `reasoning_effort` for non-Anthropic reasoning models (minimal/low/medium/high) |
| `anthropic.thinking.enabled` | `true` | Enable extended thinking for thinking-capable Claude models |
| `anthropic.thinking.budgetTokens` | `10000` | Token budget for `thinking.type=enabled` models (Opus 4.5/4.1/4, Sonnet 4.5/4/3.7, Haiku 4.5) |
| `anthropic.thinking.effort` | `high` | Adaptive-thinking effort for Opus 4.6/4.7/4.8 and Sonnet 4.6 (low/medium/high/xhigh/max) |
| `anthropic.context1M.enabled` | `true` | Enable 1M context for Opus 4.6 and Sonnet 4.6 (Opus 4.7/4.8 always use 1M) |
| `anthropic.inferenceProfiles.preferRegional` | `false` | Use regional (`us.*`/`eu.*`) profiles instead of `global.*` |

Legacy unprefixed keys (`thinking.*`, `context1M.*`, `inferenceProfiles.preferRegional`) are still read for backward compatibility but new installs should use the namespaced keys.

## Usage

Once configured, Bedrock models will appear in GitHub Copilot Chat's model selector. Simply:

1. Open GitHub Copilot Chat
2. Click on the model selector
3. Choose a model under **AWS Bedrock for Copilot** (separate from the upstream "Amazon Bedrock" if both are installed)
4. Start chatting!

## Supported Models

The extension auto-discovers every Anthropic, Amazon, Meta, Mistral, OpenAI, Google, NVIDIA, Qwen, DeepSeek, Moonshot, Z.AI, MiniMax, Writer, Cohere, and AI21 model your account has access to in the chosen region. **80+ text models** are profiled with CLI-verified capabilities.

> Open the model picker in Copilot Chat to see the live list. Each entry shows context window, max output, thinking/reasoning mode, and vision support inline; hover for full details.

Models must be **enabled** in your [Bedrock Model Access console](https://console.aws.amazon.com/bedrock/home#/modelaccess). Cross-region inference profiles (e.g. `us.*`, `eu.*`, `global.*`) are used automatically when the base model requires them.

### Reasoning and thinking at a glance

| Family | How to control depth | Settings key |
| --- | --- | --- |
| Claude Opus 4.6, 4.7, 4.8, Sonnet 4.6 | adaptive thinking + `effort` (low/medium/high/xhigh/max) | `aws-bedrock-for-copilot.anthropic.thinking.effort` |
| Claude Opus 4.5, 4.1, 4, Sonnet 4.5, Sonnet 4, Haiku 4.5 | enabled thinking + `budget_tokens` | `aws-bedrock-for-copilot.anthropic.thinking.budgetTokens` |
| OpenAI gpt-oss, DeepSeek V3.2, Kimi K2.x, Qwen3, GLM 4.7/5, MiniMax M2.x | OpenAI-style `reasoning_effort` (minimal/low/medium/high) | `aws-bedrock-for-copilot.reasoningEffort` |
| Everything else (Nova, Llama, Gemma, Mistral, NVIDIA, Cohere, AI21, Writer, &hellip;) | no reasoning controls; settings above are ignored | -- |
| DeepSeek R1, Kimi K2 Thinking | always-on reasoning, no toggle | -- |

`xhigh` is Opus 4.7/4.8 only. `max` is Opus 4.6/4.7/4.8 and Sonnet 4.6 only. Unsupported levels fall back to `high` automatically. `minimal` is OpenAI-only and silently downgraded to `low` for other vendors.

### Models that won't work with Copilot Chat

Copilot Chat needs tool calling for `@workspace`, `@terminal`, and similar features. The following are excluded for that reason:

- **DeepSeek R1** -- reasoning-only, no tool use
- **Mistral 7B, Mixtral 8x7B** -- legacy, no tool support
- **Writer Palmyra Vision 7B** -- vision-only, no tool calling
- Embedding, image-generation, and video-generation models (filtered automatically)

LEGACY-lifecycle models still appear in the picker with a `&#9888;&#xFE0E;` warning prefix; they may be gated by AWS after 30 days of account inactivity.

## Troubleshooting

### Models not showing up

1. Verify your AWS credentials are correctly configured
2. Check that you've selected the correct AWS profile and region
3. **Enable models in the Amazon Bedrock console**: Go to the [Bedrock Model Access page](https://console.aws.amazon.com/bedrock/home#/modelaccess) and request access to the models you want to use
4. Ensure your AWS account has access to Bedrock in the selected region
5. Check the "AWS Bedrock for Copilot" output channel for error messages

### Authentication errors

1. Verify your AWS credentials are valid and not expired
2. Check that your IAM user/role has the necessary Bedrock permissions:

   **Option 1: Use AWS Managed Policy (Recommended)**

   Attach the [`AmazonBedrockLimitedAccess`](https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AmazonBedrockLimitedAccess.html) managed policy to your IAM user or role. This policy includes all required permissions for using this extension.

   **Option 2: Custom Policy with Specific Permissions**

   If you prefer granular control, ensure your policy includes:
   - `bedrock:ListFoundationModels` - List available models (_optional but recommended - extension will fallback to check Anthropic models only_)
   - `bedrock:GetFoundationModelAvailability` - Check model access status (_optional but recommended_)
   - `bedrock:ListInferenceProfiles` - List cross-region inference profiles
   - `bedrock:InvokeModel` - Invoke models
   - `bedrock:InvokeModelWithResponseStream` - Stream model responses

## Building from source

```bash
bun install          # install dependencies
bun run compile      # build to dist/extension.js
bun run vsce:package # create dist/extension.vsix
```

See [AGENTS.md](./AGENTS.md) for development guidelines, fork identity details, and how to sync with upstream.

## Credits

This project is a fork of [amazon-bedrock-copilot-chat](https://github.com/tinovyatkin/amazon-bedrock-copilot-chat) by [Konstantin Vyatkin (@tinovyatkin)](https://github.com/tinovyatkin), released under the MIT License.

The original architecture -- the VSCode `LanguageModelChatProvider` integration, Bedrock streaming, message and tool conversion, and AWS authentication -- is his work. This fork preserves those foundations and layers on bugfixes, model support updates (Claude Opus 4.7, Haiku 4.5, expanded provider profiles), and identity changes that allow it to be installed alongside the upstream extension.

**If this extension is useful to you, please also star the [upstream repository](https://github.com/tinovyatkin/amazon-bedrock-copilot-chat).** The upstream project deserves the credit for making this possible; this fork simply keeps it moving during periods of reduced upstream activity.

Bugfixes and improvements here that are not fork-specific (i.e., unrelated to the parallel-install identity rename) are periodically offered upstream as PRs. If the upstream resumes active maintenance, the intent is to merge changes back and sunset this fork.

## License

MIT -- same as the [upstream project](https://github.com/tinovyatkin/amazon-bedrock-copilot-chat). The upstream copyright is preserved in [LICENSE](./LICENSE) alongside the fork's copyright. See [NOTICE](./NOTICE) for a summary of the fork relationship.
