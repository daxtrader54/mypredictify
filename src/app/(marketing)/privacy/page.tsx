import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'MyPredictify Privacy Policy',
};

export default function PrivacyPage() {
  return (
    <div className="py-16 md:py-24">
      <div className="container max-w-3xl">
        <h1 className="text-4xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-muted-foreground mb-12">Last updated: 7 February 2026</p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
            <p className="text-muted-foreground leading-relaxed">
              MyPredictify (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) is committed to protecting your privacy.
              This Privacy Policy explains how we collect, use, store, and protect your personal
              information when you use our website at mypredictify.com and associated services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Information We Collect</h2>

            <h3 className="text-lg font-medium mb-2 mt-4">Information you provide</h3>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>
                <strong>Account information:</strong> When you sign in with Google, we receive
                your name, email address, and profile picture from your Google account
              </li>
              <li>
                <strong>Payment information:</strong> If you subscribe to a paid plan, payment
                details are processed directly by Stripe. We do not store your card details
              </li>
            </ul>

            <h3 className="text-lg font-medium mb-2 mt-4">Information collected automatically</h3>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>
                <strong>Usage data:</strong> Pages viewed, predictions accessed, features used,
                credit transactions, and interaction patterns
              </li>
              <li>
                <strong>Device information:</strong> Browser type, operating system, screen
                resolution, and device type
              </li>
              <li>
                <strong>Log data:</strong> IP address, access times, referring URLs, and server
                logs for security and debugging purposes
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. How We Use Your Information</h2>
            <p className="text-muted-foreground leading-relaxed">We use your information to:</p>
            <ul className="list-disc pl-6 mt-3 space-y-2 text-muted-foreground">
              <li>Provide and maintain the Service, including personalised predictions</li>
              <li>Manage your account, credits, and subscription</li>
              <li>Process payments via Stripe</li>
              <li>Send important service updates and notifications</li>
              <li>Improve our prediction models and user experience</li>
              <li>Detect and prevent fraud, abuse, and security threats</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Data Storage and Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              Your data is stored in secure cloud databases hosted by Neon (PostgreSQL) and
              deployed via Vercel. We implement industry-standard security measures including
              encryption in transit (TLS/SSL), secure authentication via OAuth 2.0, and access
              controls. However, no method of transmission over the internet is 100% secure,
              and we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Third-Party Services</h2>
            <p className="text-muted-foreground leading-relaxed">We share limited data with:</p>
            <ul className="list-disc pl-6 mt-3 space-y-2 text-muted-foreground">
              <li>
                <strong>Google:</strong> For authentication (OAuth). Subject to{' '}
                <a href="https://policies.google.com/privacy" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                  Google&apos;s Privacy Policy
                </a>
              </li>
              <li>
                <strong>Stripe:</strong> For payment processing. Subject to{' '}
                <a href="https://stripe.com/privacy" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                  Stripe&apos;s Privacy Policy
                </a>
              </li>
              <li>
                <strong>Vercel:</strong> For hosting and deployment. Subject to{' '}
                <a href="https://vercel.com/legal/privacy-policy" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                  Vercel&apos;s Privacy Policy
                </a>
              </li>
              <li>
                <strong>Neon:</strong> For database hosting. Subject to{' '}
                <a href="https://neon.tech/privacy-policy" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                  Neon&apos;s Privacy Policy
                </a>
              </li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              We do not sell, rent, or trade your personal information to third parties for
              marketing purposes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Cookies</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use essential cookies for authentication and session management. These are
              necessary for the Service to function. We do not use advertising or tracking
              cookies. By using the Service, you consent to the use of essential cookies.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Your Rights</h2>
            <p className="text-muted-foreground leading-relaxed">
              Depending on your jurisdiction, you may have the right to:
            </p>
            <ul className="list-disc pl-6 mt-3 space-y-2 text-muted-foreground">
              <li>Access the personal data we hold about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your account and associated data</li>
              <li>Export your data in a portable format</li>
              <li>Object to or restrict certain processing of your data</li>
              <li>Withdraw consent for data processing</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              To exercise any of these rights, contact us at{' '}
              <a href="mailto:privacy@mypredictify.com" className="text-primary hover:underline">
                privacy@mypredictify.com
              </a>.
              We will respond within 30 days.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Data Retention</h2>
            <p className="text-muted-foreground leading-relaxed">
              We retain your account data for as long as your account is active. If you delete
              your account, we will remove your personal data within 30 days, except where we
              are required to retain it for legal or regulatory purposes. Anonymised usage data
              may be retained indefinitely for analytics and model improvement.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Children&apos;s Privacy</h2>
            <p className="text-muted-foreground leading-relaxed">
              MyPredictify is not intended for individuals under the age of 18. We do not
              knowingly collect personal data from children. If we become aware that we have
              collected data from someone under 18, we will take steps to delete it promptly.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. International Users</h2>
            <p className="text-muted-foreground leading-relaxed">
              Our Service is hosted and operated internationally. By using MyPredictify, you
              consent to the transfer and processing of your data outside your country of
              residence. We take appropriate safeguards to protect data during international
              transfers.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">11. Changes to This Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of
              significant changes by posting a notice on the Service or sending an email.
              The &quot;Last updated&quot; date at the top indicates the most recent revision.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">12. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              For questions or concerns about this Privacy Policy, contact us at{' '}
              <a href="mailto:privacy@mypredictify.com" className="text-primary hover:underline">
                privacy@mypredictify.com
              </a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
