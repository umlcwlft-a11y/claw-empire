import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { ApiProvider } from "../../api";
import type { ApiAssignTarget, ApiFormState, ApiStateBundle } from "./types";
import ApiSettingsTab from "./ApiSettingsTab";
import { DEFAULT_API_FORM } from "./useApiProvidersState";

vi.mock("./ApiAssignModal", () => ({
  default: () => null,
}));

function t(messages: Record<string, string>): string {
  return messages.en ?? messages.ko ?? messages.ja ?? messages.zh ?? Object.values(messages)[0] ?? "";
}

const OFFICIAL_PRESETS = {
  "opencode-go-openai": {
    label: "OpenCode Go (OpenAI)",
    description: "OpenCode Go direct API preset using the OpenAI-compatible protocol.",
    type: "openai" as const,
    base_url: "https://opencode.ai/zen/go/v1",
    docs_url: "https://opencode.ai/docs/ko/go/",
    api_key_hint: "Use an OpenCode Go direct API key for this endpoint.",
    api_key_placeholder: "sk-...",
    fallback_models: ["glm-5", "kimi-k2.5"],
  },
  "alibaba-coding-plan-openai": {
    label: "Alibaba Coding Plan (OpenAI)",
    description: "Alibaba Cloud Coding Plan direct API preset using the OpenAI-compatible protocol.",
    type: "openai" as const,
    base_url: "https://coding-intl.dashscope.aliyuncs.com/v1",
    docs_url: "https://www.alibabacloud.com/help/en/model-studio/other-tools-coding-plan",
    api_key_hint: "Coding Plan keys for this preset must start with sk-sp-.",
    api_key_placeholder: "sk-sp-...",
    fallback_models: ["qwen3.5-plus", "glm-5"],
    required_api_key_prefix: "sk-sp-",
  },
};

function TestHarness({ providers = [], addMode = true }: { providers?: ApiProvider[]; addMode?: boolean }) {
  const [apiAddMode, setApiAddMode] = useState(addMode);
  const [apiEditingId, setApiEditingId] = useState<string | null>(null);
  const [apiForm, setApiForm] = useState<ApiFormState>(DEFAULT_API_FORM);
  const [apiSaveError, setApiSaveError] = useState<string | null>(null);
  const [apiModelsExpanded, setApiModelsExpanded] = useState<Record<string, boolean>>({});
  const [apiAssignTarget, setApiAssignTarget] = useState<ApiAssignTarget | null>(null);

  const apiState: ApiStateBundle = {
    apiProviders: providers,
    apiProvidersLoading: false,
    apiOfficialPresets: OFFICIAL_PRESETS,
    apiPresetsLoading: false,
    apiAddMode,
    apiEditingId,
    apiForm,
    apiSaving: false,
    apiSaveError,
    apiTesting: null,
    apiTestResult: {},
    apiModelsExpanded,
    apiAssignTarget,
    apiAssignAgents: [],
    apiAssignDepts: [],
    apiAssigning: false,
    setApiAddMode,
    setApiEditingId,
    setApiForm,
    setApiSaveError,
    setApiModelsExpanded,
    setApiAssignTarget,
    loadApiProviders: async () => {},
    handleApiProviderSave: async () => {},
    handleApiProviderDelete: async () => {},
    handleApiProviderTest: async () => {},
    handleApiProviderToggle: async () => {},
    handleApiEditStart: (provider) => {
      setApiEditingId(provider.id);
      setApiAddMode(true);
      setApiForm({
        name: provider.name,
        type: provider.type,
        base_url: provider.base_url,
        api_key: "",
        preset_key: provider.preset_key,
      });
    },
    handleApiModelAssign: async () => {},
    handleApiAssignToAgent: async () => {},
  };

  return <ApiSettingsTab t={t} localeTag="en-US" apiState={apiState} />;
}

describe("ApiSettingsTab", () => {
  it("applies official preset values and locks Base URL editing", async () => {
    const user = userEvent.setup();
    render(<TestHarness />);

    await user.click(screen.getByRole("button", { name: /OpenCode Go \(OpenAI\)/ }));

    expect(screen.getByDisplayValue("OpenCode Go (OpenAI)")).toBeInTheDocument();
    const baseUrlInput = screen.getByPlaceholderText("https://api.openai.com/v1") as HTMLInputElement;
    expect(baseUrlInput.value).toBe("https://opencode.ai/zen/go/v1");
    expect(baseUrlInput.readOnly).toBe(true);
    expect(screen.getByText("glm-5")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open docs" })).toHaveAttribute("href", "https://opencode.ai/docs/ko/go/");
  });

  it("unlocks manual editing when switching back to a generic type", async () => {
    const user = userEvent.setup();
    render(<TestHarness />);

    await user.click(screen.getByRole("button", { name: /OpenCode Go \(OpenAI\)/ }));
    await user.click(screen.getByRole("button", { name: "Custom" }));

    const baseUrlInput = screen.getByPlaceholderText("https://api.openai.com/v1") as HTMLInputElement;
    expect(baseUrlInput.readOnly).toBe(false);
    expect(screen.getByDisplayValue("Custom")).toBeInTheDocument();
  });

  it("shows preset badge and seeded models on provider cards", async () => {
    const user = userEvent.setup();
    render(
      <TestHarness
        addMode={false}
        providers={[
          {
            id: "provider-1",
            name: "Alibaba Coding Plan",
            type: "openai",
            base_url: "https://coding-intl.dashscope.aliyuncs.com/v1",
            preset_key: "alibaba-coding-plan-openai",
            has_api_key: true,
            enabled: true,
            models_cache: ["qwen3.5-plus", "glm-5"],
            models_cached_at: 1_717_171_717_000,
            created_at: 1_717_171_717_000,
            updated_at: 1_717_171_717_000,
          },
        ]}
      />,
    );

    expect(screen.getByText("Alibaba Coding Plan (OpenAI)")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Models \(2\)/ }));
    expect(screen.getByText("qwen3.5-plus")).toBeInTheDocument();
    expect(screen.getByText("glm-5")).toBeInTheDocument();
  });
});
