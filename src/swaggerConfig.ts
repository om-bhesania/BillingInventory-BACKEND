import swaggerJsDoc from "swagger-jsdoc";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "IceCream Factory billing and invoice Swagger API",
      version: "1.0.0",
      description: "API documentation for the application",
    },
    servers: [{ url: "http://localhost:8080" }],
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
  apis: ["./**/*.ts"],
};

const swaggerSpecs = swaggerJsDoc(options);

export default swaggerSpecs;
