/**
 * Model profile system for handling provider-specific capabilities
 */

export interface ModelProfile {
  /**
   * Whether the model requires adaptive thinking (thinking.type="adaptive") instead of "enabled".
   * CLI-verified: only Claude Opus 4.7 requires this.
   */
  requiresAdaptiveThinking: boolean;
  /**
   * Whether the model requires the interleaved-thinking beta header (Claude 4 models only)
   */
  requiresInterleavedThinkingHeader: boolean;
  /**
   * Whether the model supports 1M context window
   */
  supports1MContext: boolean;
  /**
   * Whether the model supports caching with tool results (cachePoint after toolResult blocks)
   * When false, cachePoint should only be added to messages WITHOUT toolResult
   * Reference: Amazon Nova models don't support cachePoint after toolResult
   */
  supportsCachingWithToolResults: boolean;
  /**
   * Whether the model supports prompt caching via cache points
   */
  supportsPromptCaching: boolean;
  /**
   * Whether the model accepts the OpenAI-style `reasoning_effort` field via
   * additionalModelRequestFields. Valid values: low | medium | high (and
   * `minimal` for OpenAI gpt-oss only -- handled at the call site).
   *
   * CLI-verified: OpenAI gpt-oss/safeguard, DeepSeek V3.2, Moonshot Kimi K2.5
   * and K2 Thinking, Qwen3, Z.AI GLM, MiniMax M2.x. Excluded: DeepSeek R1
   * (always-on reasoning, rejects the param), NVIDIA Nemotron, Google Gemma,
   * Mistral (silently ignored on those families).
   */
  supportsReasoningEffort: boolean;
  /**
   * Whether the model supports extended thinking.
   * CLI-verified: Opus 4+, Sonnet 4+, Sonnet 3.7, Haiku 4.5
   */
  supportsThinking: boolean;
  /**
   * Whether the model supports output_config.effort ("high"/"medium"/"low").
   * CLI-verified: Opus 4.6, Opus 4.7, Sonnet 4.6 only.
   * Opus 4.5, Sonnet 4.5, Haiku 4.5 reject effort.
   */
  supportsThinkingEffort: boolean;
  /**
   * Whether the model supports the toolChoice parameter
   */
  supportsToolChoice: boolean;
  /**
   * Whether the model supports the status field in tool results (error/success)
   * Reference: https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_ToolResultBlock.html
   * Currently only Claude models support this field
   */
  supportsToolResultStatus: boolean;
  /**
   * Whether the temperature parameter is deprecated and must be omitted.
   * CLI-verified: only Claude Opus 4.7.
   */
  temperatureDeprecated: boolean;
  /**
   * Format to use for tool result content ('text' or 'json')
   */
  toolResultFormat: "json" | "text";
}

export interface ModelTokenLimits {
  /**
   * Maximum number of input tokens (context window)
   */
  maxInputTokens: number;
  /**
   * Maximum number of output tokens
   */
  maxOutputTokens: number;
}

export function getModelProfile(modelId: string): ModelProfile {
  const defaultProfile: ModelProfile = {
    requiresAdaptiveThinking: false,
    requiresInterleavedThinkingHeader: false,
    supports1MContext: false,
    supportsCachingWithToolResults: false,
    supportsPromptCaching: false,
    supportsReasoningEffort: false,
    supportsThinking: false,
    supportsThinkingEffort: false,
    supportsToolChoice: false,
    supportsToolResultStatus: false,
    temperatureDeprecated: false,
    toolResultFormat: "text",
  };

  const normalizedId = normalizeModelId(modelId);
  const parts = normalizedId.split(".");

  if (parts.length < 2) {
    return defaultProfile;
  }

  const provider = parts[0];

  // Provider-specific profiles
  switch (provider) {
    case "ai21":
    case "cohere": {
      // CLI-verified: Jamba 1.5, Command R/R+ support tool calling
      return { ...defaultProfile, supportsToolChoice: true };
    }

    case "amazon": {
      // Amazon Nova models support tool choice and prompt caching
      // Nova does NOT support cachePoint after toolResult blocks
      if (modelId.includes("nova")) {
        return {
          requiresAdaptiveThinking: false,
          requiresInterleavedThinkingHeader: false,
          supports1MContext: false,
          supportsCachingWithToolResults: false,
          supportsPromptCaching: true,
          supportsReasoningEffort: false,
          supportsThinking: false,
          supportsThinkingEffort: false,
          supportsToolChoice: true,
          supportsToolResultStatus: false,
          temperatureDeprecated: false,
          toolResultFormat: "text",
        };
      }
      return defaultProfile;
    }

    case "anthropic": {
      // CLI-verified thinking support: Opus 4+, Sonnet 4+, Sonnet 3.7, Haiku 4.5
      const supportsThinking =
        modelId.includes("opus-4") ||
        modelId.includes("sonnet-4") ||
        modelId.includes("sonnet-3-7") ||
        modelId.includes("sonnet-3.7") ||
        modelId.includes("haiku-4-5") ||
        modelId.includes("haiku-4.5");

      // Interleaved thinking (beta header) is only for Claude 4 models
      // Opus 4.7 and 4.8 use adaptive thinking and don't require this header
      const requiresInterleavedThinkingHeader =
        (modelId.includes("opus-4") &&
          !modelId.includes("opus-4-7") &&
          !modelId.includes("opus-4-8")) ||
        modelId.includes("sonnet-4");

      // Claude models with extended thinking have issues with cachePoint after toolResult
      const supportsCachingWithToolResults = !supportsThinking;

      // CLI-verified: output_config.effort is supported by Opus 4.6, 4.7, 4.8, Sonnet 4.6 ONLY.
      // Opus 4.5, Sonnet 4.5, Haiku 4.5 reject effort.
      const supportsThinkingEffort =
        modelId.includes("opus-4-6") ||
        modelId.includes("opus-4-7") ||
        modelId.includes("opus-4-8") ||
        modelId.includes("sonnet-4-6");

      // CLI-verified: Opus 4.7 and 4.8 reject thinking.type="enabled" and require "adaptive"
      const requiresAdaptiveThinking =
        modelId.includes("opus-4-7") || modelId.includes("opus-4-8");

      // CLI-verified: Opus 4.7 and 4.8 reject the temperature parameter
      const temperatureDeprecated =
        modelId.includes("opus-4-7") || modelId.includes("opus-4-8");

      return {
        requiresAdaptiveThinking,
        requiresInterleavedThinkingHeader,
        supports1MContext: supports1MContext(modelId),
        supportsCachingWithToolResults,
        supportsPromptCaching: true,
        supportsReasoningEffort: false, // Anthropic uses thinking.* / output_config.effort, not reasoning_effort
        supportsThinking,
        supportsThinkingEffort,
        supportsToolChoice: true,
        supportsToolResultStatus: true,
        temperatureDeprecated,
        toolResultFormat: "text",
      };
    }
    case "deepseek": {
      // CLI-verified: DeepSeek V3.2 supports tools and reasoning_effort.
      // R1 has always-on reasoning and rejects the parameter.
      const isR1 = modelId.includes("r1");
      return {
        ...defaultProfile,
        supportsReasoningEffort: !isR1,
        supportsToolChoice: !isR1,
      };
    }
    case "google": {
      // CLI-verified: Gemma 3 supports tool calling
      return { ...defaultProfile, supportsToolChoice: true };
    }

    case "meta": {
      // CLI-verified: all Llama models support tool calling via Converse API
      return { ...defaultProfile, supportsToolChoice: true };
    }

    case "minimax":
    case "moonshot":
    case "moonshotai":
    case "zai": {
      // CLI-verified: all support tool calling and `reasoning_effort` via Converse API
      return {
        ...defaultProfile,
        supportsReasoningEffort: true,
        supportsToolChoice: true,
      };
    }
    case "nvidia": {
      // CLI-verified: tool calling supported. `reasoning_effort` is silently
      // ignored (no reasoningContent emitted) so we don't advertise support.
      return { ...defaultProfile, supportsToolChoice: true };
    }
    case "mistral": {
      // CLI-verified: all current Mistral models on Bedrock support tool calling.
      // `reasoning_effort` is silently ignored.
      return {
        ...defaultProfile,
        supportsToolChoice: true,
        toolResultFormat: "json" as const,
      };
    }
    case "openai": {
      // CLI-verified: GPT OSS supports tools and `reasoning_effort`
      // (low | medium | high | minimal -- `max` is rejected).
      return {
        ...defaultProfile,
        supportsReasoningEffort: true,
        supportsToolChoice: true,
      };
    }
    case "qwen": {
      // CLI-verified: Qwen3 supports tools and `reasoning_effort`
      return {
        ...defaultProfile,
        supportsReasoningEffort: true,
        supportsToolChoice: true,
      };
    }

    case "writer": {
      // CLI-verified: Palmyra X4/X5 support tools (via profile); Vision 7B does not
      if (modelId.includes("vision")) {
        return defaultProfile;
      }
      return { ...defaultProfile, supportsToolChoice: true };
    }

    default: {
      return defaultProfile;
    }
  }
}

/**
 * Get token limits for a given Bedrock model ID
 * Returns model-specific token limits for known models, or conservative defaults for others
 * @param modelId The full Bedrock model ID (e.g., "anthropic.claude-3-5-sonnet-20241022-v2:0")
 * @param enable1MContext Whether to enable 1M context for supported models (default: false)
 * @returns Token limits with maxInputTokens and maxOutputTokens
 */
export function getModelTokenLimits(modelId: string, enable1MContext = false): ModelTokenLimits {
  const normalizedModelId = normalizeModelId(modelId);

  // Claude models have specific token limits based on model family
  if (normalizedModelId.startsWith("anthropic.claude")) {
    return getClaudeTokenLimits(normalizedModelId, enable1MContext);
  }

  // Default for unknown models
  return {
    maxInputTokens: 196_000, // 200K context - 4K output
    maxOutputTokens: 4096,
  };
}

/**
 * Get token limits for a Claude model based on its normalized model ID
 */
function getClaudeTokenLimits(
  normalizedModelId: string,
  enable1MContext: boolean,
): ModelTokenLimits {
  // Claude Opus 4.8: 1M context, 128K max output (matches Opus 4.7)
  if (normalizedModelId.includes("opus-4-8")) {
    return {
      maxInputTokens: 1_000_000 - 128_000,
      maxOutputTokens: 128_000,
    };
  }

  // Claude Opus 4.7: 1M context, 128K max output (per Anthropic docs)
  if (normalizedModelId.includes("opus-4-7")) {
    return {
      maxInputTokens: 1_000_000 - 128_000,
      maxOutputTokens: 128_000,
    };
  }

  // Claude Opus 4.6: 1M context, 128K max output (per Anthropic docs)
  if (normalizedModelId.includes("opus-4-6")) {
    return {
      maxInputTokens: (enable1MContext ? 1_000_000 : 200_000) - 128_000,
      maxOutputTokens: 128_000,
    };
  }

  // Claude Sonnet 4.6: 200K context (or 1M with setting enabled), 128K output
  // AWS-verified: Bedrock allows up to 128000 output tokens (Anthropic docs say 64K)
  if (normalizedModelId.includes("sonnet-4-6")) {
    return {
      maxInputTokens: (enable1MContext ? 1_000_000 : 200_000) - 128_000,
      maxOutputTokens: 128_000,
    };
  }

  // Claude Sonnet 4.5: 200K context, 64K output (AWS-verified limit: 64000)
  if (normalizedModelId.includes("sonnet-4-5")) {
    return { maxInputTokens: 200_000 - 64_000, maxOutputTokens: 64_000 };
  }

  // Claude Sonnet 4: 200K context, 64K output (AWS-verified limit: 65536)
  if (normalizedModelId.includes("sonnet-4")) {
    return { maxInputTokens: 200_000 - 65_536, maxOutputTokens: 65_536 };
  }

  // Claude Sonnet 3.7: 200K context, 128K output (AWS-verified limit: 131072)
  if (normalizedModelId.includes("sonnet-3-7") || normalizedModelId.includes("sonnet-3.7")) {
    return { maxInputTokens: 200_000 - 128_000, maxOutputTokens: 128_000 };
  }

  // Claude Opus 4.5: 200K context, 64K output (per Anthropic docs)
  if (normalizedModelId.includes("opus-4-5")) {
    return { maxInputTokens: 200_000 - 64_000, maxOutputTokens: 64_000 };
  }

  // Claude Opus 4.1: 200K context, 32K output (AWS-verified limit: 32000)
  if (normalizedModelId.includes("opus-4-1")) {
    return { maxInputTokens: 200_000 - 32_000, maxOutputTokens: 32_000 };
  }

  // Claude Opus 4: 200K context, 32K output (AWS-verified limit: 32768)
  if (normalizedModelId.includes("opus-4")) {
    return { maxInputTokens: 200_000 - 32_768, maxOutputTokens: 32_768 };
  }

  // Claude Haiku 4.5: 200K context, 64K output
  if (normalizedModelId.includes("haiku-4-5") || normalizedModelId.includes("haiku-4.5")) {
    return { maxInputTokens: 200_000 - 64_000, maxOutputTokens: 64_000 };
  }

  // Claude Haiku 3.5: 200K context, 8,192 output
  if (normalizedModelId.includes("haiku-3-5") || normalizedModelId.includes("haiku-3.5")) {
    return { maxInputTokens: 200_000 - 8192, maxOutputTokens: 8192 };
  }

  // Claude Haiku 3: 200K context, 4,096 output
  if (normalizedModelId.includes("haiku-3")) {
    return { maxInputTokens: 200_000 - 4096, maxOutputTokens: 4096 };
  }

  // Claude 3.5 Sonnet (older): 200K context, 8,192 output
  if (normalizedModelId.includes("sonnet-3-5") || normalizedModelId.includes("sonnet-3.5")) {
    return { maxInputTokens: 200_000 - 8192, maxOutputTokens: 8192 };
  }

  // Claude Opus 3: 200K context, 4,096 output
  if (normalizedModelId.includes("opus-3")) {
    return { maxInputTokens: 200_000 - 4096, maxOutputTokens: 4096 };
  }

  // Default for unknown Claude models
  return { maxInputTokens: 196_000, maxOutputTokens: 4096 };
}

/**
 * Normalize a Bedrock model ID by stripping inference profile prefixes.
 * Handles both regional prefixes (us., eu., ap., etc.) and global prefix (global.)
 * @param modelId The full Bedrock model ID with optional prefix
 * @returns Normalized model ID without prefix
 * @example
 * normalizeModelId("global.anthropic.claude-opus-4-5") → "anthropic.claude-opus-4-5"
 * normalizeModelId("us.anthropic.claude-opus-4-5") → "anthropic.claude-opus-4-5"
 * normalizeModelId("anthropic.claude-opus-4-5") → "anthropic.claude-opus-4-5"
 */
function normalizeModelId(modelId: string): string {
  const parts = modelId.split(".");
  if (parts.length > 2 && (parts[0].length === 2 || parts[0] === "global")) {
    return parts.slice(1).join(".");
  }
  return modelId;
}

/**
 * Check if a model supports 1M context window
 * Claude Opus 4.6, 4.7, 4.8, Sonnet 4.6, and Sonnet 4.x models support extended 1M context via anthropic_beta parameter
 */
function supports1MContext(modelId: string): boolean {
  // Per Anthropic docs: Opus 4.7/4.8 always 1M, Opus 4.6 and Sonnet 4.6 support 1M via beta header
  return (
    modelId.includes("opus-4-7") ||
    modelId.includes("opus-4-8") ||
    modelId.includes("opus-4-6") ||
    modelId.includes("sonnet-4-6")
  );
}

/**
 * Resolve the user-requested effort level to one supported by the given model.
 * CLI-verified: xhigh is Opus 4.7/4.8 only; max is Opus 4.6/4.7/4.8 + Sonnet 4.6.
 * Unsupported levels fall back to "high".
 */
export function resolveEffortLevel(
  requested: "high" | "low" | "max" | "medium" | "xhigh",
  modelId: string,
): "high" | "low" | "max" | "medium" | "xhigh" {
  const normalized = normalizeModelId(modelId);
  if (
    requested === "xhigh" &&
    !normalized.includes("opus-4-7") &&
    !normalized.includes("opus-4-8")
  ) {
    return "high";
  }
  if (
    requested === "max" &&
    !normalized.includes("opus-4-7") &&
    !normalized.includes("opus-4-8") &&
    !normalized.includes("opus-4-6") &&
    !normalized.includes("sonnet-4-6")
  ) {
    return "high";
  }
  return requested;
}

/**
 * Get the model profile for a given Bedrock model ID
 * @param modelId The full Bedrock model ID (e.g., "anthropic.claude-3-5-sonnet-20241022-v2:0")
 * @returns Model profile with capabilities
 */
