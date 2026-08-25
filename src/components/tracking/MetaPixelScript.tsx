import Script from 'next/script';

type MetaPixelScriptProps = { pixelId: string };

// Official base code. fbq queues calls made before fbevents.js loads, so
// early track() calls are safe.
export function MetaPixelScript({ pixelId }: MetaPixelScriptProps) {
  return (
    <Script id="meta-pixel" strategy="afterInteractive">
      {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
// Automatic event detection / Automatic Advanced Matching would scrape button
// text and form fields (e.g. the projection CTA "Protocolo personalizado de N
// kg") and send them to Meta outside the EVENT_MAP allowlist, so it is off.
fbq('set', 'autoConfig', false, '${pixelId}');
fbq('init', '${pixelId}');
fbq('track', 'PageView');`}
    </Script>
  );
}
