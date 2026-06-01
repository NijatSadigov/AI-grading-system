package ai

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"
)

type Client struct {
	apiKey string
	model  string
	http   *http.Client
}

func NewClient() *Client {
	model := os.Getenv("ANTHROPIC_MODEL")
	if model == "" {
		model = "claude-sonnet-4-6"
	}
	return &Client{
		apiKey: os.Getenv("ANTHROPIC_API_KEY"),
		model:  model,
		http:   &http.Client{Timeout: 90 * time.Second},
	}
}

func (c *Client) Model() string { return c.model }

type apiMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type apiRequest struct {
	Model     string       `json:"model"`
	MaxTokens int          `json:"max_tokens"`
	System    string       `json:"system,omitempty"`
	Messages  []apiMessage `json:"messages"`
}

type contentBlock struct {
	Type string `json:"type"`
	Text string `json:"text"`
}

type apiResponse struct {
	Content []contentBlock `json:"content"`
	Error   *struct {
		Type    string `json:"type"`
		Message string `json:"message"`
	} `json:"error,omitempty"`
}

func (c *Client) Complete(systemPrompt, userPrompt string) (string, error) {
	if c.apiKey == "" {
		return "", fmt.Errorf("ANTHROPIC_API_KEY not set")
	}

	body, err := json.Marshal(apiRequest{
		Model:     c.model,
		MaxTokens: 4000,
		System:    systemPrompt,
		Messages:  []apiMessage{{Role: "user", Content: userPrompt}},
	})
	if err != nil {
		return "", err
	}

	req, err := http.NewRequest("POST", "https://api.anthropic.com/v1/messages", bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-api-key", c.apiKey)
	req.Header.Set("anthropic-version", "2023-06-01")

	resp, err := c.http.Do(req)
	if err != nil {
		return "", fmt.Errorf("anthropic request failed: %w", err)
	}
	defer resp.Body.Close()

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	var parsed apiResponse
	if err := json.Unmarshal(data, &parsed); err != nil {
		return "", fmt.Errorf("could not parse anthropic response (status %d): %s", resp.StatusCode, string(data))
	}

	if resp.StatusCode != 200 {
		if parsed.Error != nil {
			return "", fmt.Errorf("anthropic API error (%d): %s", resp.StatusCode, parsed.Error.Message)
		}
		return "", fmt.Errorf("anthropic API error (%d): %s", resp.StatusCode, string(data))
	}

	if len(parsed.Content) == 0 {
		return "", fmt.Errorf("empty response from anthropic")
	}

	var result string
	for _, block := range parsed.Content {
		if block.Type == "text" {
			result += block.Text
		}
	}
	return result, nil
}
