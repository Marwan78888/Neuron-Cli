
const url = 'https://openrouter.ai/api/v1/chat/completions';
const body = {
    model: 'openrouter/auto-detect',
    messages: [{ role: 'user', content: 'test' }],
};

async function testOpenRouter() {
    console.log('Testing OpenRouter without referer...');
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // No Authorization if we want to see if we get the cookie error
            },
            body: JSON.stringify(body),
        });
        const text = await response.text();
        console.log(`Status: ${response.status}`);
        console.log(`Body: ${text}`);
    } catch (e) {
        console.error(e);
    }

    console.log('\nTesting OpenRouter with referer but NO auth...');
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://neuron.bot',
                'X-Title': 'Neuron',
            },
            body: JSON.stringify(body),
        });
        const text = await response.text();
        console.log(`Status: ${response.status}`);
        console.log(`Body: ${text}`);
    } catch (e) {
        console.error(e);
    }
}

testOpenRouter();
