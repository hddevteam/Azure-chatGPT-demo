let promptImpersonate = "<|im_start|>system\nYou are an AI assistant that helps people find information.\n<|im_end|>\n";
let prompts = [];
// add the promptImpersonate to the prompts array last so that it is the last prompt
prompts.push(promptImpersonate);

const messagesContainer = document.getElementById('messages');
const messageForm = document.getElementById('message-form');
const messageInput = document.getElementById('message-input');

// 发送消息到API
async function sendMessage(message) {
    addMessage('user', message);
    let userPrompt = "<|im_start|>user\n" + message + "\n<|im_end|>\n";
    prompts.push(userPrompt);
    const promptText = prompts.join('');
    console.log(promptText);

    messageInput.value = '';

    // 发送请求到API
    const response = await fetch('/api/gpt', {
        method: 'post',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ prompt: promptText })
    });

    if (!response.ok) {
        addMessage('bot', 'Error generating response.');
        return;
    }

    let data = await response.text();
    console.log(data);
    //if the data string is '' or null, then we need to remove the last prompt from the prompts array
    if (data === '' || data === null) {
        prompts.pop();
        data = "AI没有返回结果，请再说一下你的问题，或者换个问题问我吧。";
    } else {
        // 添加回复到prompt
        prompts.push("<|im_start|>assistant\n" + data + "\n<|im_end|>\n");
        //if the prompts is too long, then we need to remove the first prompt from the prompts array
        if (prompts.length > 4) {
            prompts.shift();
        }
        
    }
    addMessage('bot', data);
    
}

// 添加消息到消息容器
function addMessage(sender, message) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message');
    messageElement.classList.add(`${sender}-message`);
    if (message.includes('```')) {
        const codeBlocks = message.match(/```(\w+)?\n([\s\S]+?)\n```/g);
        if (codeBlocks) {
            codeBlocks.forEach((block) => {
                const code = block.replace(/```(\w+)?\n([\s\S]+?)\n```/, '$2');
                const pre = document.createElement('pre');
                const codeElement = document.createElement('code');
                codeElement.innerText = code;
                pre.appendChild(codeElement);
                message = message.replace(block, pre.outerHTML);
            });
        }
        messageElement.innerHTML = message;
    } else {
        messageElement.innerText = message;
    }

    messagesContainer.appendChild(messageElement);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// 发送消息
messageForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const message = messageInput.value.trim();
    if (message) {
        sendMessage(message);
    }
});

messageInput.focus();