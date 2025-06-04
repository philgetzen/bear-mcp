#!/usr/bin/env node

// Simple test script to verify Bear API is working
import { execSync } from "child_process";
import * as http from "http";
import { URL } from "url";

const BEAR_URL_SCHEME = "bear://x-callback-url";
const CALLBACK_PORT = 51235; // Different port to avoid conflicts
const CALLBACK_TIMEOUT = 10000; // Longer timeout

interface BearResponse {
  [key: string]: any;
}

class SimpleCallbackHandler {
  private server: http.Server | null = null;
  private responsePromise: Promise<BearResponse> | null = null;
  private responseResolve: ((value: BearResponse) => void) | null = null;
  private responseReject: ((error: Error) => void) | null = null;

  async startServer(): Promise<void> {
    if (this.server) return;

    this.server = http.createServer((req, res) => {
      console.log(`Received request: ${req.url}`);
      
      if (!req.url) {
        res.writeHead(400);
        res.end();
        return;
      }

      const url = new URL(req.url, `http://localhost:${CALLBACK_PORT}`);
      console.log(`Parsed URL: ${url.pathname}`);
      console.log(`Search params:`, Object.fromEntries(url.searchParams));
      
      if (url.pathname === "/bear-callback") {
        const response: BearResponse = {};
        
        url.searchParams.forEach((value, key) => {
          console.log(`Processing param: ${key} = ${value}`);
          try {
            // Try to parse as JSON (for arrays)
            response[key] = JSON.parse(decodeURIComponent(value));
          } catch {
            // If not JSON, treat as string
            response[key] = decodeURIComponent(value);
          }
        });

        console.log(`Final response object:`, response);

        if (this.responseResolve) {
          this.responseResolve(response);
        }

        res.writeHead(200, { "Content-Type": "text/html" });
        res.end("<html><body><h1>Success!</h1><p>Response received and processed.</p></body></html>");
      } else {
        res.writeHead(404);
        res.end();
      }
    });

    await new Promise<void>((resolve) => {
      this.server!.listen(CALLBACK_PORT, () => {
        console.log(`Callback server listening on port ${CALLBACK_PORT}`);
        resolve();
      });
    });
  }

  async waitForCallback(): Promise<BearResponse> {
    this.responsePromise = new Promise<BearResponse>((resolve, reject) => {
      this.responseResolve = resolve;
      this.responseReject = reject;
      
      setTimeout(() => {
        reject(new Error("Callback timeout"));
      }, CALLBACK_TIMEOUT);
    });

    return this.responsePromise;
  }

  stopServer(): void {
    if (this.server) {
      this.server.close();
      this.server = null;
      console.log("Callback server stopped");
    }
  }
}

async function testBearAPI() {
  const handler = new SimpleCallbackHandler();
  
  try {
    console.log("Starting callback server...");
    await handler.startServer();
    
    // Test 1: Tags (requires token)
    console.log("\n=== Testing Tags Operation ===");
    const tagsUrl = new URL(`${BEAR_URL_SCHEME}/tags`);
    tagsUrl.searchParams.append("x-success", `http://localhost:${CALLBACK_PORT}/bear-callback`);
    tagsUrl.searchParams.append("x-error", `http://localhost:${CALLBACK_PORT}/bear-callback`);
    
    console.log(`Opening URL: ${tagsUrl.toString()}`);
    
    const script = `open location "${tagsUrl.toString()}"`;
    execSync(`osascript -e '${script}'`);
    
    const tagsResponse = await handler.waitForCallback();
    console.log("Tags response:", tagsResponse);
    
  } catch (error) {
    console.error("Error:", error);
  } finally {
    handler.stopServer();
  }
  
  // Test 2: Search without token
  try {
    console.log("\n=== Testing Search Operation (no token) ===");
    await handler.startServer();
    
    const searchUrl = new URL(`${BEAR_URL_SCHEME}/search`);
    searchUrl.searchParams.append("term", "test");
    searchUrl.searchParams.append("x-success", `http://localhost:${CALLBACK_PORT}/bear-callback`);
    searchUrl.searchParams.append("x-error", `http://localhost:${CALLBACK_PORT}/bear-callback`);
    
    console.log(`Opening URL: ${searchUrl.toString()}`);
    
    const script2 = `open location "${searchUrl.toString()}"`;
    execSync(`osascript -e '${script2}'`);
    
    const searchResponse = await handler.waitForCallback();
    console.log("Search response:", searchResponse);
    
  } catch (error) {
    console.error("Error:", error);
  } finally {
    handler.stopServer();
  }
}

if (require.main === module) {
  testBearAPI();
}