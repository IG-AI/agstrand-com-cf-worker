export async function proxy(request) {
    const url = new URL(request.url);
    const { pathname, search } = url;

    const destinationURL = `${base}${pathname}${search}`;
    console.log(destinationURL);

    return Response.redirect(destinationURL, statusCode);
}
