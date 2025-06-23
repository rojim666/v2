const express = require('express');
const cors = require('cors');
const { OpenAI } = require('openai');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 8080;

// 中间件
app.use(cors());
app.use(express.json());

// DeepSeek平台客户端配置
const deepSeekClient = new OpenAI({
  apiKey: "sk-e580e4d0d96d43e3a98244fbc232419e", // 请替换为你的DeepSeek API Key
  baseURL: "https://api.deepseek.com/v1",
});

// API路由 - DeepSeek 聊天接口
app.post('/api/v1/chat/completions', async (req, res) => {
  try {
    console.log('🤖 收到聊天请求:', req.body);
    
    // 检查是否是流式请求
    if (req.body.stream) {
      // 流式响应
      res.writeHead(200, {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      });

      const stream = await deepSeekClient.chat.completions.create({
        model: req.body.model || "deepseek-chat",
        messages: req.body.messages,
        temperature: req.body.temperature || 0.7,
        max_tokens: req.body.max_tokens || 10000,
        stream: true,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          res.write(`data: ${JSON.stringify(chunk)}\n\n`);
        }
      }

      res.write('data: [DONE]\n\n');
      res.end();
      console.log('✅ 流式响应完成');
    } else {
      // 非流式响应
      const response = await deepSeekClient.chat.completions.create({
        model: req.body.model || "deepseek-chat",
        messages: req.body.messages,
        temperature: req.body.temperature || 0.7,
        max_tokens: req.body.max_tokens || 10000,
      });

      console.log('✅ DeepSeek平台响应成功');
      res.json(response);
    }
  } catch (error) {
    console.error('❌ DeepSeek平台调用失败:', error);
    
    if (req.body.stream && !res.headersSent) {
      res.writeHead(500, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      });
    }
    
    res.status(500).json({
      error: '调用DeepSeek平台失败',
      details: error.message
    });
  }
});

// API路由 - DeepSeek模型列表
app.get('/api/v1/models', async (req, res) => {
  try {
    const response = await deepSeekClient.models.list();
    res.json(response);
  } catch (error) {
    console.error('❌ 获取DeepSeek模型列表失败:', error);
    res.status(500).json({
      error: '获取DeepSeek模型列表失败',
      details: error.message
    });
  }
});

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(port, () => {
  console.log(`🚀 后端服务器运行在端口 ${port}`);
  console.log(`📡 API端点: http://localhost:${port}/api/v1`);
}); 