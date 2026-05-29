# Changelog

All notable changes to the `aws-bedrock-for-copilot` extension are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

This changelog is split into two sections:

- **[Fork changelog](#fork-changelog-rangan2510aws-bedrock-for-copilot)** -- changes in this fork (`rangan2510/aws-bedrock-for-copilot`) on top of the upstream `v0.11.0` baseline.
- **[Upstream changelog](#upstream-changelog-tinovyatkinamazon-bedrock-copilot-chat)** -- preserved history of the original [`tinovyatkin/amazon-bedrock-copilot-chat`](https://github.com/tinovyatkin/amazon-bedrock-copilot-chat) project.

---

## Fork changelog (`rangan2510/aws-bedrock-for-copilot`)

### [0.12.0-fork.6] - 2026-05-29

#### Fixed

- **`requiresInterleavedThinkingHeader` for Opus 4.7 and 4.8** -- adaptive-thinking models must not send the `interleaved-thinking-2025-05-14` beta header. The condition now explicitly excludes both `opus-4-7` and `opus-4-8`. Previously, Opus 4.7 was not excluded in this fork (upstream already excluded it); without this fix, both models would receive a beta header they don't need, which can cause `ValidationException` responses. Identified via CodeRabbit review of upstream PR #661.

### [0.12.0-fork.5] - 2026-05-29

#### Fixed

- **Empty / zero-event streams** are now handled with a clear "the server closed the streaming connection without sending any data" message instead of the generic "did not produce a response" fallback. Observed on Opus 4.8 with very large requests (200K+ token context, dozens of tools) where Bedrock occasionally returns a successful HTTP 200 but the EventStream body completes without a single event. The user can retry the turn directly from the chat UI.
- **Malformed model output / malformed tool use** stop reasons (`malformed_model_output`, `malformed_tool_use`) now surface a dedicated, recoverable message rather than falling through to the catch-all.

#### Added

- **AWS request-id logging** -- `ConverseStream` response metadata (request-id, HTTP status, attempts, CloudFront ID) is now logged at debug level so empty streams can be cross-referenced with AWS support.
- **Event-count tracking** in stream completion logs -- the `eventCount: N` field in `[Stream Processor] Stream processing completed` makes it obvious when zero events were received versus a stream that ran but produced no visible content.

### [0.12.0-fork.4] - 2026-05-29

#### Added

- **Sync with upstream `tinovyatkin/amazon-bedrock-copilot-chat@87cf46c`** ("[codex] fix Claude 4.7 fallback profile detection", PR #597) -- broader inference-profile prefix recognition for newer geo-prefixed regional profiles (`jp.`, `au.`, `mx.`, partition-specific `cn-north.`, `cn-northwest.`, `us-gov-east.`, `us-gov-west.`); regional-first profile selection that prefers the local geo prefix over the partition default; Claude Opus 4.7 / Sonnet 4.7 added to the Anthropic fallback probes used when `ListFoundationModels` is denied.
- **Claude Opus 4.8 fallback probe** -- added to the same fallback list with geo-prefix support, so accounts that block `ListFoundationModels` can still discover Opus 4.8 in `ap-northeast-1` / `ap-southeast-2` / etc.

### [0.12.0-fork.3] - 2026-05-29

#### Added

- **Claude Opus 4.8 support** -- recognise `opus-4-8` model IDs and apply the same constraints as Opus 4.7: `thinking.type: "adaptive"` (rejects `enabled`), `temperature` parameter omitted (rejected by the model), 1M context window with 128K max output, and `xhigh` effort level. Without this, requests to Opus 4.8 failed with `ValidationException: 'temperature' is deprecated for this model.`

### [0.12.0-fork.2] - 2026-05-14

#### Fixed

- **`BodyTimeoutError: terminated` after ~5 minutes during long Claude streams** -- replaced the `smithy-node-native-fetch` HTTP handler (which uses Node's native `fetch`/undici under the hood) with `@smithy/node-http-handler` (Node's `http`/`https` modules directly). Undici enforces a hard-coded 5-minute body timeout that aborted streaming requests when Claude Opus 4.7 paused for extended thinking longer than 5 minutes. The new handler has `socketTimeout: 0` (no idle timeout) and TCP keep-alive packets every 30 s to prevent network middleboxes from dropping silent connections. Bundle size also dropped from 2.10 MB to 1.98 MB.

### [0.12.0-fork.1] - 2026-05-14

#### Fixed

- **Models invisible in the VS Code 1.116+ Copilot Chat picker** -- VS Code 1.116 introduced two proposed-API properties (`agentMode` in `capabilities` and `isUserSelectable` at the top level of `LanguageModelChatInformation`) that gate model visibility in the agent-mode model selector. Without them, every model contributed by this extension was hidden. Added a `PickerLanguageModelChatInformation` intersection type and set both properties to `true` on every model (foundation, inference profile, manual entry).

### [0.11.2] - 2026-05-06

#### Fixed

- **Reduced extended thinking log spam** -- multi-turn conversations no longer emit a `[warning]` on every request about disabling extended thinking; downgraded to `debug` since this is expected behavior when VS Code can't preserve thinking blocks across turns
- **Eliminated "Sorry, no response was returned" errors** -- added soft fallback messages for all empty-response scenarios (`MAX_TOKENS` exhausted on reasoning, unknown stop reasons, catch-all) so users see an actionable message instead of the generic VS Code error
- **Thinking-only responses with `MAX_TOKENS`** -- when the model emits thinking to the UI but hits the token limit before producing text, the response is no longer treated as a fatal error

---

### [0.11.1-fork.2] - 2026-04-26

#### Added

- **`reasoning_effort` for non-Anthropic models** -- new top-level `aws-bedrock-for-copilot.reasoningEffort` setting (minimal/low/medium/high). Forwarded as `reasoning_effort` for OpenAI gpt-oss, DeepSeek V3.2, Moonshot Kimi K2.5/K2 Thinking, Qwen3, Z.AI GLM, MiniMax M2.x. Silently ignored on families that don't support it; `minimal` is OpenAI-only and is downgraded to `low` for other vendors
- **`supportsReasoningEffort` flag** in `ModelProfile` -- CLI-verified per provider against the live Bedrock Converse API
- **Vendor-namespaced Anthropic settings** -- new keys: `anthropic.thinking.enabled`, `anthropic.thinking.budgetTokens`, `anthropic.thinking.effort`, `anthropic.context1M.enabled`, `anthropic.inferenceProfiles.preferRegional`. The pre-namespace flat keys (`thinking.*`, `context1M.*`, `inferenceProfiles.preferRegional`) are still read for backward compatibility
- **Region dropdown** -- `aws-bedrock-for-copilot.region` is now an `enum` of known Bedrock regions with friendly labels in the Settings UI
- **Capability-aware tooltip and detail strings** in the model picker -- each entry shows context window, max output, thinking/reasoning mode, and vision support inline; hover for full detail and any LEGACY warning
- **LEGACY models surfaced** -- previously hidden, now shown with a `⚠︎` glyph prefix on the display name and a tooltip note about the AWS 30-day deprecation gate

#### Changed

- **Foundation-model filtering** -- `bedrock-client.ts` no longer drops `LEGACY` models from `ListFoundationModels`; the provider surfaces them with a warning so users can decide
- **README** -- replaced the long per-vendor model tables with a concise capability summary, a new Settings reference, and pointers to the in-product picker
- **Anthropic-namespaced setting descriptions** in `package.json` updated to match the actual model-by-model behaviour (e.g. `budgetTokens` only applies to enabled-thinking models, not adaptive ones)

---

### [0.11.1-fork.1] - 2026-04-26

#### Added

- **Parallel extension identity**: Renamed extension name, publisher, vendor, command IDs, and config namespace to `aws-bedrock-for-copilot.*` so it can be installed alongside the upstream `bedrock` extension without conflicts
- **Credits and fork attribution**: Added explicit `## Credits` section in `README.md` and a `NOTICE` file at the repo root summarising the upstream relationship
- **Fork copyright line**: Added fork copyright to `LICENSE` alongside the preserved upstream copyright
- **Claude Opus 4.7 support**: Handles `thinking.type: "adaptive"` requirement and the deprecated `temperature` parameter introduced in Opus 4.7
- **Claude Haiku 4.5 extended thinking**: Added missing thinking (`enabled + budget`) configuration
- **Expanded provider profiles**: CLI-verified tool calling and vision capability profiles for 80+ models across 14 providers (Qwen, Kimi, GLM, MiniMax, NVIDIA, Gemma, DeepSeek, Writer, Cohere, AI21, and more)

#### Fixed

- **Correct thinking modes per Claude generation**: CLI-verified thinking configuration -- adaptive for Opus 4.7, enabled+budget for 4.5/4.1/4/3.7/Haiku 4.5, both for 4.6 models
- **Correct token limits**: Opus 4.7 set to 1M context / 128K output; Opus 4.1/4 corrected to 32K output, per Anthropic docs
- **Graceful tool_use fallback**: Models that return unparseable tool JSON no longer crash the request; a helpful message is surfaced instead

#### Changed

- **Repository URLs**: `repository.url` and `bugs.url` in `package.json` point to this fork so the VSCode Marketplace rewrites README image URLs to this repo rather than upstream
- **Logo**: New fork logo in `assets/logo.png`

---

## Upstream changelog (`tinovyatkin/amazon-bedrock-copilot-chat`)

The entries below are preserved verbatim from the upstream project and document history prior to this fork.

## [0.8.0] - 2026-02-23

### Added

- **Claude Sonnet 4.6 Support**: Full model configuration for `anthropic.claude-sonnet-4-6` with extended thinking, 1M context window (beta), and thinking effort control (high/medium/low)

## [0.7.0] - 2026-02-08

### Added

- **Claude Opus 4.6 Support**: Full model configuration for `anthropic.claude-opus-4-6-v1`
  - 128K max output tokens (up from 64K on previous Opus models)
  - Optional 1M context window via `context-1m-2025-08-07` beta header
  - Adaptive thinking (effort parameter) support, matching Opus 4.5 capability
  - Fallback detection for restricted-permission environments
  - Note: Opus 4.6 uses a new AWS naming convention without the `:0` suffix

## [0.6.1] - 2025-12-19

### Fixed

- **AWS GovCloud and China Regions**: Fixed region prefix parsing and inference profile detection for non-commercial partitions
  - GovCloud regions (us-gov-west-1, us-gov-east-1) now use correct three-part prefixes
  - Fallback model detection skips global profiles in GovCloud/China (not supported)
  - See [GOVCLOUD-COMPATIBILITY.md](./GOVCLOUD-COMPATIBILITY.md) for details

## [0.6.0] - 2025-12-19

### Added

- **Thinking Effort Control**: New `bedrock.thinking.effort` setting for Claude Opus 4.5
  - Choose between `high` (default), `medium`, or `low` effort levels
  - Balances response quality vs. token usage
  - Works with or without extended thinking enabled

## [0.5.13] - 2025-12-19

### Fixed

- Profile auth now honors `sdk_ua_app_id` from AWS config by passing it as `userAgentAppId` during credential resolution (fixes role assumption failures for some profiles)

## [0.1.17] - 2025-10-17

### Added

- **Accurate Token Counting**: Implemented AWS Bedrock CountTokens API for precise, model-specific token counting
  - Uses official AWS API that matches actual inference tokenization and costs
  - Automatically converts VSCode messages to Bedrock Converse format for counting
  - Gracefully falls back to character-based estimation when API is unavailable
  - CountTokens API calls are free (no charges incurred)
  - Supported for Claude 3.5/3.7/4 models in all major regions

- **Global Inference Profile Support**: Models with global inference profiles now appear in model list
  - Automatically detects and prefers global inference profiles (e.g., `global.anthropic.claude-sonnet-4-5-...`)
  - Falls back to regional inference profiles, then base model IDs
  - Global profiles provide best availability by routing across all AWS regions
  - Tooltips distinguish between "Global Inference Profile" and "Regional Inference Profile"

### Improved

- **Request Validation**: Pre-flight token counting now uses CountTokens API for accurate validation
  - Unified `countRequestTokens()` method counts messages + system prompts + tools together
  - Validates against `maxInputTokens` before sending request to prevent API errors
  - Provides accurate token counts in error messages when limit exceeded
  - Removed separate estimation methods in favor of unified API-based counting

- **Cancellation Support**: Enhanced request cancellation handling across all AWS SDK operations
  - Added AbortSignal support to `startConversationStream()` for streaming requests
  - Added AbortSignal support to `countTokens()` for token counting requests
  - Proper cleanup with AbortController disposal in finally blocks
  - Prevents resource leaks when operations are cancelled by user

### Fixed

- **Content Filtering Error Visibility**: Users now always see an error when responses are filtered
  - Previously, if content was partially generated before filtering, no error was shown
  - This left users confused seeing partial text then silence
  - Now throws clear error for both mid-generation and pre-generation filtering
  - Error messages distinguish between partial vs complete filtering
  - Uses official AWS SDK `StopReason` enum instead of string literals for type safety
  - **Important distinction**: `CONTENT_FILTERED` includes Anthropic Claude's built-in safety filtering (AI Safety Level 3 in Claude 4.5), not just AWS Bedrock Guardrails
  - Added handling for `GUARDRAIL_INTERVENED` (explicit AWS Bedrock Guardrails) vs `CONTENT_FILTERED` (model's built-in filtering)
  - Added handling for `MODEL_CONTEXT_WINDOW_EXCEEDED` stop reason

- **Inference Profile Support**: CountTokens API now works correctly with all inference profile types
  - CountTokens API doesn't accept inference profile IDs directly (e.g., `us.anthropic.claude-...`)
  - Uses GetInferenceProfile API to resolve profile IDs to base model IDs
  - Supports both regional (`us.`, `eu.`, `ap.`) and global (`global.`) inference profiles
  - Caches profile → model ID mappings to minimize API calls
  - Pattern-based detection distinguishes inference profiles from regular model IDs
  - Enhanced error logging at trace level shows full error details for debugging
  - Cache automatically cleared when region/profile settings change

### Technical Details

Per AWS documentation at https://docs.aws.amazon.com/bedrock/latest/userguide/count-tokens.html:

- Token counting is model-specific using each model's tokenization strategy
- Returns exact token count that would be charged for the same input in inference
- Helps estimate costs before sending inference requests
- Currently supported for Anthropic Claude 3.5 Haiku, 3.5 Sonnet (v1/v2), 3.7 Sonnet, Opus 4, and Sonnet 4 models
- Available in US East/West, Asia Pacific, Europe, and South America regions

**Inference Profile Resolution**: CountTokens API does not accept cross-region inference profile IDs
directly. The implementation uses GetInferenceProfile API to retrieve the underlying base model ID
from the profile's ARN, then passes that to CountTokens. Results are cached in-memory to minimize
API calls.

## [0.1.16] - 2025-10-16

### Added

- **Guardrail Detection**: Comprehensive monitoring of AWS Bedrock Guardrails during streaming
  - Detects account-level and organization-level guardrail policies
  - Recursive policy detection for blocked content (action:BLOCKED + detected:true)
  - Detailed logging with actionable guidance when content is blocked
  - Helps diagnose why certain models (e.g., Sonnet 4.5) may be blocked

### Fixed

- **Stop Reason Correction**: Fixed incorrect stop reasons when models use tools
  - Some Bedrock models incorrectly report `end_turn` instead of `tool_use`
  - Now tracks tool usage and corrects stop reason for accurate flow control

- **Context Window Overflow**: Better error detection and messaging
  - Detects specific Bedrock API error patterns for context window overflow
  - Provides actionable guidance (reduce history, remove tool results, adjust parameters)
  - Uses `util.inspect` for safe error stringification

### Improved

- **Model Compatibility**: Enhanced support for different Bedrock models
  - Tool result `status` field now only included for models that support it (Claude models)
  - Deepseek models: Filter out `reasoningContent` blocks in multi-turn conversations
  - Prevents validation errors with non-Claude models

### Technical Details

All changes implemented following [strands-agents](https://github.com/strands-agents/sdk-python) best practices:

- Stop reason correction pattern from strands-agents streaming implementation
- Guardrail detection using recursive policy checking algorithm
- Model-specific capability profiles for tool result status
- Context window overflow detection with known error message patterns

## [0.1.15] - 2025-10-15

### Fixed

- Message conversion now skips empty text parts to prevent Bedrock validation errors
  - Filters out empty/whitespace-only text content blocks before API submission
  - Prevents `ValidationException: The text field in the ContentBlock object is blank` errors
  - Applied to user, assistant, and system messages

## [0.1.13] - 2025-10-15

### Fixed

- Extended thinking now works with tool use (function calling)
  - Capture signature deltas from reasoning content stream
  - Skip tool_choice setting when thinking enabled (API constraint)
  - Only store and reinject thinking blocks with valid signatures
  - Prevents validation errors while maintaining thinking continuity
- Comprehensive trace logging for debugging message structures
- Stack traces included in error logs for better troubleshooting

### Technical Details

This release resolves the incompatibility between extended thinking and tool use through three key fixes:

1. **Signature Delta Capture**: Signatures are streamed incrementally via `signature_delta` fields. We now accumulate them during stream processing, just like thinking text.

2. **Tool Choice Constraint**: The API rejects `tool_choice` settings (auto/any) when extended thinking is enabled. We now skip setting tool_choice entirely when thinking is active.

3. **Signature Filtering**: Only thinking blocks with valid signatures can be reinjected in subsequent requests. Blocks without signatures are discarded with debug logging.

These changes enable extended thinking to work seamlessly with tool calling, providing both deep reasoning and function calling capabilities simultaneously.

## [0.0.1] - 2024-10-12

### Added

- Initial release
- AWS named profile support for authentication
- Support for all Bedrock foundation models with streaming and text output
- Settings management command for AWS profile and region selection
- Integration with GitHub Copilot Chat
- Support for tool/function calling
- Support for vision models (image input)
- Cross-region inference profile support
- Comprehensive error handling and logging

### Features

- AWS profile selection from `~/.aws/credentials` and `~/.aws/config`
- Default credentials chain support (when no profile selected)
- Region selection across 14 AWS regions
- Streaming responses for real-time feedback
- Model-specific capability detection (tool choice, tool result format)
- Token count estimation

### Developer Notes

- Based on bedrock-vscode-chat by Aristide
- Uses AWS SDK v3 with `@aws-sdk/credential-providers`
- TypeScript with strict mode enabled
- ESLint and Prettier configured for code quality
