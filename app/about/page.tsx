import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About',
  description: 'A little bit about me.',
};

export default function AboutPage() {
  return (
    <section>
      <h1 className="title font-semibold text-2xl tracking-tighter">About Me</h1>
      <div className="prose mt-8">
        <h3 className="title font-semibold text-xl tracking-tighter">Professional bio</h3>
        <p>
          I'm currently the Head of Product at RudderStack, a customer data infrastructure company that streams behavioral event data. 
        </p>
        <p>
          I am a successful former founder and current software product leader. Over the years I've held key go-to-market roles with a focus on marketing, but have found the most joy working close to and in product. I particularly enjoy tackling the XY problem, working directly with engineers and product marketing. 
       </p>
       <p>
          I've proven my ability to build teams, ship work as an individual contributor and take functions from 0-1 as a player-coach (and enjoy each). I function well in ambiguity.
       </p>
       <p>
          I've built a variety of tactical skills across product, marketing, product marketing, data/analytics and building efficient operations in each of those areas. (In another life I would have been a software engineer, so the age of AI is a true dream as a technical tinkerer.) My recent focus areas as a product leader have been:
       </p>

          <ul>
              <li>Sharpening my ability to help run an EPD org across multiple international cultures and timezones</li>
              <li>Building out a develeper experience strategy to enable centralized IAC for programmatic management of the platform</li>
              <li>Integrating AI tooling into our product development process</li>
              <li>Helping shape the AI strategy and roadmap for our product</li>
          </ul>

       <p>
          My peers describe my superpowers as first-principles thinking, product-mindedness and writing (of all kinds). On multiple occasions these have been applied in the formation of strategies, both on a micro and macro level.
       </p>

        <blockquote>
        Eric has a unique ability to translate complex technical concepts into compelling narratives that move businesses forward. At RudderStack, he was the partner I consistently turned to when we needed to challenge our thinking and ensure we were building something customers would actually value. His product intuition, combined with his marketing expertise, made him an invaluable cross-functional leader who could be counted on when execution really mattered.
        <br /><br />
        <strong>—Sagan Shultz, Product @ Linear</strong>
        </blockquote>
      </div>
      <div className="prose mt-8">
        <h3 className="title font-semibold text-xl tracking-tighter">Writing</h3>
        <p>
         I have considered a career in writing, which may happen in the future, but I truly enjoy product work and practice the craft almost every day, which scratches the itch. 
        </p>
        <p>
         This blog went stale for some time, but I wrote an immense amount in that time, both personally and professionally (including a published memoir about my special needs brother-in-law). 
        </p>
        <p>
         Professionally, I have written technical documentation and tutorials, books on technical topics (one published), UX copy, internal strategy memos, technical blog posts, thought leadership pieces, web copy, advertising copy, enterprise product marketing collateral, and more. Leading a product function, much of the content I create today is internal in the form of product strategies, PRDs, technical requirements and draft documentation.
       </p>
      </div>
      <div className="prose mt-8">
        <h3 className="title font-semibold text-xl tracking-tighter">Personal bio</h3>
        <p>
         I live in South Carolina with my wife and three children.
        </p>
        <p>
         When I'm not working, I like to be outside. I'm an avid mountain biker and runner. 
       </p>
        <p>
         I also enjoy working with my hands. I'm an ameteur mechanic, so I'm often fixing something around the house and tinkering with our beloved 1985 Toyota Land Cruiser FJ60. 
        </p>
      </div>
    </section>
  );
} 