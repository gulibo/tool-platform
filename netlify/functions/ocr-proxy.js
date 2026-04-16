// Netlify Function - OCR代理
exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { files, extractType } = JSON.parse(event.body);

    if (!files || !Array.isArray(files) || files.length === 0) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'No files provided' }) };
    }

    const apiKey = process.env.GLM_API_KEY;
    if (!apiKey) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'API key not configured' }) };
    }

    const results = [];
    for (const file of files) {
      const result = await processFileWithGLM(file, apiKey, extractType);
      results.push(result);
    }

    return { statusCode: 200, headers, body: JSON.stringify({ success: true, data: results }) };

  } catch (error) {
    console.error('OCR Proxy Error:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
  }
};

async function processFileWithGLM(file, apiKey, extractType) {
  const { base64Data, mimeType, fileName } = file;
  const prompt = buildExtractionPrompt(extractType, fileName);

  try {
    const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'glm-4.6v-flash',
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Data}` } }
          ]
        }],
        temperature: 0.1,
        max_tokens: 4096
      })
    });

    if (!response.ok) throw new Error(`GLM API error: ${response.status}`);

    const data = await response.json();
    const content = data.choices[0].message.content;

    return {
      fileName,
      mimeType,
      extractType,
      extractedData: parseExtractedData(content)
    };

  } catch (error) {
    return { fileName, mimeType, extractType, error: error.message, extractedData: null };
  }
}

function buildExtractionPrompt(extractType, fileName) {
  const prompts = {
    invoice: `请识别这张发票图片，提取以下关键信息并返回JSON格式：
{
  "发票类型": "增值税发票/火车票/出租车票/飞机票/其他",
  "发票号码": "",
  "开票日期": "YYYY-MM-DD格式",
  "销售方名称": "",
  "购买方名称": "",
  "价税合计金额小写": "数字，不含单位",
  "价税合计金额大写": "",
  "税率": "",
  "税额": "",
  "备注": "",
  "是否为火车票": true/false,
  "车次": "",
  "出发站": "",
  "到达站": "",
  "发车时间": "",
  "到达时间": "",
  "座位类型": "",
  "票价": ""
}
注意：
1. 如果是火车票，isTrainTicket设为true，并提取车次、出发站、到达站、发车时间、票价
2. 如果是加油票，sellerName包含"油"或"石化"等关键词
3. 如果是高速通行费，sellerName包含"高速"或"路桥"等关键词
4. 金额只返回数字，不要带"元"或"¥"符号
5. 日期统一返回YYYY-MM-DD格式
6. 如果没有某个字段，返回空字符串`,

    payment: `请识别这张支付记录图片，提取以下关键信息并返回JSON格式：
{
  "支付时间": "YYYY-MM-DD HH:mm:ss格式",
  "支付金额": "数字，不含单位",
  "收款方": "",
  "付款方": "",
  "支付方式": "微信/支付宝/银行卡/其他",
  "支付状态": "成功/失败/其他",
  "商品描述": "",
  "商户全称": "",
  "交易单号": ""
}
注意：
1. 支付时间尽量精确到秒
2. 金额只返回数字，不要带"元"或"¥"符号
3. 收款方和商户全称可能不同，都提取出来
4. 如果没有某个字段，返回空字符串`,

    caseApproval: `请识别这张外出办案审批表图片，提取以下关键信息并返回JSON格式：
{
  "案件名称": "",
  "案件编号": "",
  "办案地点": "",
  "联合办案单位": "",
  "案件情况": "简要描述",
  "审批人": "",
  "审批日期": "YYYY-MM-DD格式",
  "出差人": "",
  "出差起始日期": "YYYY-MM-DD格式",
  "出差截止日期": "YYYY-MM-DD格式",
  "出差天数": "数字"
}
注意：
1. 案件名称通常是表格标题或第一行的大字
2. 办案地点可能包含多个地点，用逗号分隔
3. 如果没有某个字段，返回空字符串`,

    travelApproval: `请识别这张出差审批单图片，提取以下关键信息并返回JSON格式：
{
  "出差人": "",
  "行业外人员": "",
  "出差起始日期": "YYYY-MM-DD格式",
  "出差截止日期": "YYYY-MM-DD格式",
  "出差天数": "数字",
  "到达地": "",
  "出差事由": "",
  "审批人": "",
  "审批日期": "YYYY-MM-DD格式",
  "交通工具": ""
}
注意：
1. 出差人可能有多个，用逗号分隔
2. 行业外人员如果没有，返回空字符串
3. 日期统一返回YYYY-MM-DD格式
4. 如果没有某个字段，返回空字符串`,

    caseReport: `请识别这张立案报告表图片，提取以下关键信息并返回JSON格式：
{
  "案件编号": "",
  "案件名称": "",
  "立案时间": "YYYY-MM-DD格式",
  "立案人": "",
  "案件类型": "",
  "案件摘要": ""
}
注意：
1. 案件编号通常是表格中标注为"案号"或"案件编号"的字段
2. 如果没有某个字段，返回空字符串`,

    carRental: `请识别这张租车结算单图片，提取以下关键信息并返回JSON格式：
{
  "车牌号码": "",
  "取车时间": "YYYY-MM-DD HH:mm格式",
  "还车时间": "YYYY-MM-DD HH:mm格式",
  "租车天数": "数字",
  "车辆品牌": "",
  "车辆型号": "",
  "费用总金额": "数字，不含单位",
  "费用明细": {
    "租车费": "",
    "保险费": "",
    "油费": "",
    "其他费用": ""
  }
}
注意：
1. 车牌号码格式如：京A12345
2. 时间尽量精确到分钟
3. 金额只返回数字，不要带"元"或"¥"符号
4. 如果没有某个字段，返回空字符串`,

    auto: `请识别这张图片，判断文档类型并提取关键信息：
1. 首先判断文档类型：发票/支付记录/外出办案审批表/出差审批单/立案报告表/租车结算单/其他
2. 根据类型提取相应的关键信息
3. 返回JSON格式：
{
  "文档类型": "",
  "提取的数据": {
    // 根据文档类型填充相应字段
  }
}
注意：
1. 尽量准确判断文档类型
2. 提取所有可见的关键信息
3. 金额统一返回数字格式
4. 日期统一返回YYYY-MM-DD格式`
  };
  return prompts[extractType] || prompts.auto;
}

function parseExtractedData(content) {
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
    return { rawText: content };
  } catch (e) {
    return { rawText: content, parseError: e.message };
  }
}
