let promptImpersonate = "You are an AI assistant that helps people find information.";
let prompts = [];
// add the promptImpersonate to the prompts array last so that it is the last prompt
prompts.push({ "role": "system", "content": promptImpersonate });

const messagesContainer = document.getElementById('messages');
const messageForm = document.getElementById('message-form');
const messageInput = document.getElementById('message-input');


// 发送消息到API
async function sendMessage(message) {

    // if the message is 'clear', then we need to clear the content in the messages container
    if (message === 'clear') {
        clearMessage();
        return;
    }

    addMessage('user', message);

    prompts.push({ role: "user", content: message });
    const promptText = JSON.stringify(prompts);
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

    // check if the response is ok
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
        prompts.push({ role: "assistant", content: data });
        //if the prompts is too long, then we need to remove 2th prompt from the prompts array, 
        // and add the promptImpersonate to the first prompts array
        if (prompts.length > 6) {
            prompts.shift();
            prompts.shift();
            prompts.unshift({ role: "system", content: promptImpersonate });
        }

    }
    addMessage('bot', data);
}

// create a function to clear the content in the messages container,
// and also clear the prompts array, also add the promptImpersonate to the prompts array
function clearMessage() {
    messagesContainer.innerHTML = ''; 
    messageInput.value = '';
    prompts = [];
    prompts.push({ "role": "system", "content": promptImpersonate });
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
    }
    const formattedMessage = message.replace(/\n/g, '<br>');
    messageElement.innerHTML = formattedMessage;

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