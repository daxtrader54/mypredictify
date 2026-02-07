import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'MyPredictify Terms of Service',
};

export default function TermsPage() {
  return (
    <div className="py-16 md:py-24">
      <div className="container max-w-3xl">
        <h1 className="text-4xl font-bold mb-2">Terms of Service</h1>
        <p className="text-muted-foreground mb-12">Last updated: 7 February 2026</p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              By accessing or using MyPredictify (&quot;the Service&quot;), operated at mypredictify.com,
              you agree to be bound by these Terms of Service. If you do not agree to these terms,
              you may not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Description of Service</h2>
            <p className="text-muted-foreground leading-relaxed">
              MyPredictify provides AI-powered football match predictions, statistical analysis,
              and betting insight tools for informational and entertainment purposes. The Service
              includes match predictions, value bet suggestions, accumulator (ACCA) building tools,
              and related analytics for the top European football leagues.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Not Betting Advice</h2>
            <p className="text-muted-foreground leading-relaxed">
              The predictions, statistics, and analysis provided by MyPredictify are for
              informational and entertainment purposes only. They do not constitute financial
              advice, betting advice, or any form of guaranteed outcome. You are solely responsible
              for any betting decisions you make. Past performance does not guarantee future results.
              Always gamble responsibly and within your means.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Eligibility</h2>
            <p className="text-muted-foreground leading-relaxed">
              You must be at least 18 years old (or the legal age for gambling in your jurisdiction,
              whichever is higher) to use MyPredictify. By using the Service, you confirm that you
              meet this age requirement. It is your responsibility to ensure that accessing and using
              the Service is legal in your jurisdiction.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. User Accounts</h2>
            <p className="text-muted-foreground leading-relaxed">
              You may create an account using Google OAuth. You are responsible for maintaining the
              security of your account and all activities that occur under it. You must not share
              your account credentials or allow others to access your account. We reserve the right
              to suspend or terminate accounts that violate these terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Credits and Subscriptions</h2>
            <p className="text-muted-foreground leading-relaxed">
              The Service operates on a credit-based system. Free accounts receive a monthly
              credit allocation with daily bonus credits. Pro subscriptions provide increased
              credit allowances and access to additional features and leagues.
            </p>
            <ul className="list-disc pl-6 mt-3 space-y-2 text-muted-foreground">
              <li>Credits are non-transferable and have no monetary value</li>
              <li>Unused credits do not roll over between billing periods</li>
              <li>Pro subscriptions are billed monthly or annually via Stripe</li>
              <li>You may cancel your subscription at any time; access continues until the end of the billing period</li>
              <li>Refunds are handled on a case-by-case basis at our discretion</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Acceptable Use</h2>
            <p className="text-muted-foreground leading-relaxed">You agree not to:</p>
            <ul className="list-disc pl-6 mt-3 space-y-2 text-muted-foreground">
              <li>Use the Service for any unlawful purpose</li>
              <li>Attempt to reverse-engineer, scrape, or extract data from the Service</li>
              <li>Redistribute, resell, or republish prediction data without permission</li>
              <li>Use automated tools to access the Service beyond the provided API (if applicable)</li>
              <li>Interfere with or disrupt the Service or its infrastructure</li>
              <li>Create multiple accounts to circumvent credit limits</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Intellectual Property</h2>
            <p className="text-muted-foreground leading-relaxed">
              All content on MyPredictify, including predictions, analysis, algorithms, design,
              and branding, is the intellectual property of MyPredictify and is protected by
              applicable copyright and trademark laws. You may not copy, modify, or distribute
              any content without prior written consent.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              MyPredictify is provided &quot;as is&quot; without warranties of any kind. We do not guarantee
              the accuracy, completeness, or reliability of any predictions or analysis. In no event
              shall MyPredictify be liable for any direct, indirect, incidental, special, or
              consequential damages arising from your use of the Service, including but not limited
              to financial losses from betting decisions.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Data and Third-Party Services</h2>
            <p className="text-muted-foreground leading-relaxed">
              Our predictions rely on third-party data sources including SportMonks and bookmaker
              odds feeds. We are not responsible for the accuracy of third-party data. Our Service
              uses Stripe for payment processing and Google for authentication — your use of these
              services is also subject to their respective terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">11. Changes to Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              We reserve the right to modify these terms at any time. Material changes will be
              communicated via the Service or email. Continued use of the Service after changes
              constitutes acceptance of the updated terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">12. Contact</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have questions about these Terms of Service, please contact us at{' '}
              <a href="mailto:support@mypredictify.com" className="text-primary hover:underline">
                support@mypredictify.com
              </a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
