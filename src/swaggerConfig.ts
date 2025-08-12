import swaggerJsDoc from "swagger-jsdoc";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Bliss Ice Cream Management System API",
      version: "1.0.0",
      description: "Complete API documentation for the Bliss Ice Cream multi-shop management system. Includes authentication, user management, shop management, inventory, and billing operations.",
    },
    servers: [{ url: "http://localhost:5000" }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ["./src/routes/**/*.ts", "./src/controllers/**/*.ts"],
};

const swaggerSpecs = swaggerJsDoc(options);

export default swaggerSpecs;
