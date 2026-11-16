import { NextResponse, type NextRequest } from "next/server";

function hasSession(request: NextRequest) {
  return request.cookies.has("authjs.session-token") || request.cookies.has("__Secure-authjs.session-token");
}

export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const loggedIn = hasSession(request);
  if (!loggedIn && path !== "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  if (loggedIn && path === "/login") {
    return NextResponse.redirect(new URL("/", request.nextUrl));
  }

  const requestHeaders = new Headers(request.headers);
  const embedRequested =
    request.nextUrl.searchParams.get("embed") === "1" || request.cookies.get("northstar_embed")?.value === "1";
  if (embedRequested) requestHeaders.set("x-northstar-embed", "1");
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  if (request.nextUrl.searchParams.get("embed") === "1") {
    response.cookies.set("northstar_embed", "1", { path: "/", sameSite: "lax" });
  }
  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|icon.svg|.*\\.png$).*)"],
};
