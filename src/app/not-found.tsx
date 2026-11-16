import Link from "next/link";

export default function NotFound() {
  return (
    <main className="login-wrap">
      <div className="card login">
        <h1>That page is not in Northstar</h1>
        <p>
          <Link href="/">Back home</Link>
        </p>
      </div>
    </main>
  );
}
