
'use client';

import Head from 'next/head';

export default function RedirectingLoader() {
  return (
    <div className="redirecting-loader-container">
      <Head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@500&display=swap" rel="stylesheet" />
      </Head>
      <div className="body">
        <span>
          <span />
          <span />
          <span />
          <span />
          <span />
        </span>
        <div className="base">
          <span />
          <div className="face" />
        </div>
      </div>
      <div className="longfazers">
        <span />
        <span />
        <span />
        <span />
      </div>
      <h1>Redirecting...</h1>
    </div>
  );
}
