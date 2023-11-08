export async function(request)
    const client = new MomentoFetcher(env.MOMENTO_API_KEY, env.MOMENTO_REST_ENDPOINT);
    const cache = env.MOMENTO_CACHE_NAME;
    const key = 'user';
    const f_name = 'mo';
    const l_name = 'squirrel';
    const value = `${f_name}_${l_name}`;

    // set a value into cache
    const setResponse = await client.set(cache, key, value);
    console.log('setResponse', setResponse);

    // read a value from cache
    const getResponse = await client.get(cache, key);
    console.log('getResponse', getResponse);

    return new Response(JSON.stringify({
      response: getResponse
    }));