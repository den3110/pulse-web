import React from "react";
import { Helmet } from "react-helmet-async";

import { useTranslation } from "react-i18next";

interface SEOProps {
  title: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: string;
  structuredData?: object;
}

const SEO: React.FC<SEOProps> = ({
  title,
  description,
  keywords,
  image = "/og-image.png",
  url,
  type = "website",
  structuredData,
}) => {
  const { t, i18n } = useTranslation();
  const siteTitle = "Pulse";
  const fullTitle = `${title} | ${siteTitle}`;
  const currentUrl = url || window.location.href;

  const finalDescription = description || t("seo.defaultDescription");
  const finalKeywords = keywords || t("seo.defaultKeywords");

  return (
    <Helmet>
      <html lang={i18n.language} />
      {/* Standard Metadata */}
      <title>{fullTitle}</title>
      <meta name="description" content={finalDescription} />
      <meta name="keywords" content={finalKeywords} />
      <link rel="canonical" href={currentUrl} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={currentUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={finalDescription} />
      <meta property="og:image" content={image} />

      {/* Twitter */}
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content={currentUrl} />
      <meta property="twitter:title" content={fullTitle} />
      <meta property="twitter:description" content={finalDescription} />
      <meta property="twitter:image" content={image} />

      {/* JSON-LD Structured Data */}
      {structuredData && (
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      )}
    </Helmet>
  );
};

export default SEO;
