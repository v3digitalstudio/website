import { Arrow } from "./primitives";

const services = [
  {
    number: "01",
    title: "Web development",
    description:
      "Distinctive marketing websites built to load quickly, tell your story, and make the next step clear. We bring design and development together so every detail works as well as it looks.",
  },
  {
    number: "02",
    title: "Application development",
    description:
      "From the first prototype to a product ready for launch, we build applications around what your customers need. Modern frameworks and AI-assisted development help us explore ideas, test assumptions, and refine the experience.",
  },
  {
    number: "03",
    title: "E-commerce",
    description:
      "Online stores that make your products easy to discover and simple to buy. We build on Shopify or create a custom storefront when your business needs more flexibility.",
  },
  {
    number: "04",
    title: "Custom content management",
    description:
      "A content system built around your team. Publish pages, update products, and keep your website current without waiting for a developer to make every change.",
  },
] as const;

export function FieldServices() {
  return (
    <section
      id="approach"
      className="field-services section"
      aria-labelledby="field-services-title"
    >
      <p className="eyebrow">What we bring</p>
      <div className="field-service-intro">
        <h2 id="field-services-title">
          We help you identify, explore, and build on new opportunities.
        </h2>
        <p>
          We bring design, modern web technology, and AI together to turn a
          promising idea into something you can launch. Here’s where we can
          help.
        </p>
      </div>
      <div>
        {services.map((service, index) => (
          <details key={service.number} open={index === 0}>
            <summary>
              <span>{service.number}</span> {service.title} <Arrow diagonal />
            </summary>
            <p>{service.description}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
