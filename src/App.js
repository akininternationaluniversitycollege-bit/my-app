import React, { useState, useEffect, useRef } from "react";

// WARNING: Never expose your API key in production frontend code!
const BLACKBOX_API_KEY = "sk-pf8-gifmpLrlW3OvTfOfjg";
const BLACKBOX_API_URL = "https://api.blackbox.ai/chat/completions";

function App() {
  const [messages, setMessages] = useState([
    { role: "system", content: "You are an intelligent AI coding assistant." },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [code, setCode] = useState("");
  const [uploadedImage, setUploadedImage] = useState(null);
  const [imageProcessingResult, setImageProcessingResult] = useState("");
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  async function sendMessage(content) {
    if (!content.trim()) return;

    const updatedMessages = [...messages, { role: "user", content }];
    setMessages(updatedMessages);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch(BLACKBOX_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${BLACKBOX_API_KEY}`,
        },
        body: JSON.stringify({
          model: "blackboxai/openai/gpt-4",
          messages: updatedMessages,
          temperature: 0.5,
          max_tokens: 1024,
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }
      const data = await response.json();

      const aiMessage = data?.choices?.[0]?.message?.content || "No response";
      setMessages((msg) => [...msg, { role: "assistant", content: aiMessage }]);

      if (aiMessage.includes("```")) {
        const codeMatch = aiMessage.match(/```(?:\w*\n)?([\s\S]*?)```/);
        setCode(codeMatch ? codeMatch[1] : "");
      } else {
        setCode("");
      }
    } catch (error) {
      setMessages((msg) => [
        ...msg,
        { role: "assistant", content: `Error: ${error.message}` },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    setUploadedImage(URL.createObjectURL(file));
    setImageProcessingResult("");
    setCode("");
    setIsLoading(true);

    try {
      const base64 = await toBase64(file);

      const prompt = `Analyze this UI design image and generate responsive HTML/CSS code based on it.

[Image Base64 Below]
data:${file.type};base64,${base64}`;

      const response = await fetch(BLACKBOX_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${BLACKBOX_API_KEY}`,
        },
        body: JSON.stringify({
          model: "blackboxai/openai/gpt-4",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.3,
          max_tokens: 1500,
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }
      const data = await response.json();
      const aiResponse = data?.choices?.[0]?.message?.content || "No result";

      if (aiResponse.includes("```")) {
        const codeMatch = aiResponse.match(/```(?:\w*\n)?([\s\S]*?)```/);
        setCode(codeMatch ? codeMatch[1] : aiResponse);
      } else {
        setCode(aiResponse);
      }

      setImageProcessingResult(
        "Image-to-code processing complete. See code below."
      );
      setMessages((msg) => [
        ...msg,
        { role: "assistant", content: "Image design converted to code." },
      ]);
    } catch (error) {
      setImageProcessingResult(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }

  function toBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result.split(",")[1]);
      reader.onerror = (error) => reject(error);
    });
  }

  return (
    <div
      style={{
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        maxWidth: 900,
        margin: "auto",
        padding: 20,
        backgroundColor: "#121212",
        color: "#eee",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <header style={{ textAlign: "center", marginBottom: 15 }}>
        <h1>AI Coding Assistant (Blackbox.ai-like)</h1>
        <small>Powered by Blackbox API</small>
      </header>

      <section
        style={{
          flex: "1 1 auto",
          overflowY: "auto",
          backgroundColor: "#1e1e1e",
          borderRadius: 8,
          padding: 15,
          fontSize: 15,
          lineHeight: 1.4,
          marginBottom: 20,
        }}
      >
        {messages
          .filter((m) => m.role !== "system")
          .map((msg, idx) => (
            <div key={idx} style={{ marginBottom: 12, whiteSpace: "pre-wrap" }}>
              <b style={{ color: msg.role === "user" ? "#4fc3f7" : "#a3ffac" }}>
                {msg.role === "user" ? "User:" : "Assistant:"}
              </b>{" "}
              {msg.content}
            </div>
          ))}
        <div ref={messagesEndRef} />
      </section>

      <section style={{ marginBottom: 20 }}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage(input);
          }}
        >
          <input
            type="text"
            placeholder="Enter your prompt or code question here..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            style={{
              width: "70%",
              padding: 8,
              fontSize: 16,
              borderRadius: 4,
              border: "none",
              marginRight: 10,
              outline: "none",
              backgroundColor: "#333",
              color: "#eee",
            }}
          />
          <button
            type="submit"
            disabled={isLoading || input.trim().length === 0}
            style={{
              padding: "8px 16px",
              fontSize: 16,
              borderRadius: 4,
              border: "none",
              cursor: "pointer",
              backgroundColor: "#4fc3f7",
              color: "#121212",
              fontWeight: "bold",
            }}
          >
            {isLoading ? "Processing..." : "Send"}
          </button>
        </form>
      </section>

      <section style={{ marginBottom: 20 }}>
        <label
          style={{
            cursor: "pointer",
            display: "inline-block",
            marginBottom: 8,
          }}
        >
          Upload UI Design Image (PNG/JPEG) for AI to convert to code:
        </label>
        <input
          type="file"
          accept="image/png, image/jpeg"
          disabled={isLoading}
          onChange={handleImageUpload}
          style={{ display: "block", marginBottom: 8 }}
        />
        {uploadedImage && (
          <img
            src={uploadedImage}
            alt="Uploaded UI Design"
            style={{ maxWidth: "100%", borderRadius: 8, marginBottom: 8 }}
          />
        )}
        <div style={{ fontStyle: "italic", color: "#ccc" }}>
          {imageProcessingResult}
        </div>
      </section>

      <section style={{ flex: "1 1 auto" }}>
        <label>AI-Generated Code Output:</label>
        <textarea
          readOnly
          value={code}
          style={{
            width: "100%",
            height: 300,
            backgroundColor: "#222",
            color: "#aaffaa",
            fontFamily: "monospace",
            fontSize: 14,
            padding: 10,
            borderRadius: 6,
            border: "1px solid #444",
            resize: "vertical",
          }}
        />
      </section>

      <footer
        style={{
          textAlign: "center",
          marginTop: 20,
          fontSize: 13,
          color: "#777",
        }}
      >
        &copy; 2025 AI Coding Assistant Demo using Blackbox API
      </footer>
    </div>
  );
}

export default App;
