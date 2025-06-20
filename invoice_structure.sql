--
-- PostgreSQL database dump
--

-- Dumped from database version 15.13 (Debian 15.13-0+deb12u1)
-- Dumped by pg_dump version 17.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: ERole; Type: TYPE; Schema: public; Owner: invoice_user
--

CREATE TYPE public."ERole" AS ENUM (
    'SU'
);


ALTER TYPE public."ERole" OWNER TO invoice_user;

--
-- Name: EmailAutomationType; Type: TYPE; Schema: public; Owner: invoice_user
--

CREATE TYPE public."EmailAutomationType" AS ENUM (
    'BEFORE_DUE',
    'ON_DUE',
    'AFTER_DUE'
);


ALTER TYPE public."EmailAutomationType" OWNER TO invoice_user;

--
-- Name: InvoiceStatus; Type: TYPE; Schema: public; Owner: invoice_user
--

CREATE TYPE public."InvoiceStatus" AS ENUM (
    'PAID',
    'UNPAID',
    'DUE',
    'BAD_DEBT'
);


ALTER TYPE public."InvoiceStatus" OWNER TO invoice_user;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Client; Type: TABLE; Schema: public; Owner: invoice_user
--

CREATE TABLE public."Client" (
    id text NOT NULL,
    "legalName" text NOT NULL,
    email text NOT NULL,
    address text NOT NULL,
    "netTerms" integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Client" OWNER TO invoice_user;

--
-- Name: Company; Type: TABLE; Schema: public; Owner: invoice_user
--

CREATE TABLE public."Company" (
    id text NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    address text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    file text
);


ALTER TABLE public."Company" OWNER TO invoice_user;

--
-- Name: EmailAutomation; Type: TABLE; Schema: public; Owner: invoice_user
--

CREATE TABLE public."EmailAutomation" (
    id text NOT NULL,
    type public."EmailAutomationType" NOT NULL,
    enabled boolean DEFAULT false NOT NULL,
    "daysBefore" integer,
    "daysAfter" integer,
    subject text NOT NULL,
    body text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."EmailAutomation" OWNER TO invoice_user;

--
-- Name: EmailLog; Type: TABLE; Schema: public; Owner: invoice_user
--

CREATE TABLE public."EmailLog" (
    id text NOT NULL,
    "invoiceId" text NOT NULL,
    type public."EmailAutomationType" NOT NULL,
    "sentAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    recipient text NOT NULL,
    subject text NOT NULL,
    body text NOT NULL,
    error text,
    status text DEFAULT 'LOGGED'::text
);


ALTER TABLE public."EmailLog" OWNER TO invoice_user;

--
-- Name: Invoice; Type: TABLE; Schema: public; Owner: invoice_user
--

CREATE TABLE public."Invoice" (
    id text NOT NULL,
    "invoiceNumber" text NOT NULL,
    date timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "dueDate" timestamp(3) without time zone NOT NULL,
    status public."InvoiceStatus" DEFAULT 'UNPAID'::public."InvoiceStatus" NOT NULL,
    "companyId" text NOT NULL,
    "clientId" text NOT NULL,
    "paymentMethodId" text,
    "userId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    subtotal double precision,
    isdeleted boolean DEFAULT false NOT NULL
);


ALTER TABLE public."Invoice" OWNER TO invoice_user;

--
-- Name: InvoiceItem; Type: TABLE; Schema: public; Owner: invoice_user
--

CREATE TABLE public."InvoiceItem" (
    id text NOT NULL,
    "invoiceId" text NOT NULL,
    "productId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    quantity integer NOT NULL,
    total double precision NOT NULL,
    "customPrice" double precision
);


ALTER TABLE public."InvoiceItem" OWNER TO invoice_user;

--
-- Name: PaymentMethod; Type: TABLE; Schema: public; Owner: invoice_user
--

CREATE TABLE public."PaymentMethod" (
    id text NOT NULL,
    "methodName" text NOT NULL,
    info text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."PaymentMethod" OWNER TO invoice_user;

--
-- Name: Product; Type: TABLE; Schema: public; Owner: invoice_user
--

CREATE TABLE public."Product" (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Product" OWNER TO invoice_user;

--
-- Name: User; Type: TABLE; Schema: public; Owner: invoice_user
--

CREATE TABLE public."User" (
    id text NOT NULL,
    email text NOT NULL,
    password text NOT NULL,
    name text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    role character varying(20)
);


ALTER TABLE public."User" OWNER TO invoice_user;

--
-- Name: Client Client_pkey; Type: CONSTRAINT; Schema: public; Owner: invoice_user
--

ALTER TABLE ONLY public."Client"
    ADD CONSTRAINT "Client_pkey" PRIMARY KEY (id);


--
-- Name: Company Company_pkey; Type: CONSTRAINT; Schema: public; Owner: invoice_user
--

ALTER TABLE ONLY public."Company"
    ADD CONSTRAINT "Company_pkey" PRIMARY KEY (id);


--
-- Name: EmailAutomation EmailAutomation_pkey; Type: CONSTRAINT; Schema: public; Owner: invoice_user
--

ALTER TABLE ONLY public."EmailAutomation"
    ADD CONSTRAINT "EmailAutomation_pkey" PRIMARY KEY (id);


--
-- Name: EmailLog EmailLog_pkey; Type: CONSTRAINT; Schema: public; Owner: invoice_user
--

ALTER TABLE ONLY public."EmailLog"
    ADD CONSTRAINT "EmailLog_pkey" PRIMARY KEY (id);


--
-- Name: InvoiceItem InvoiceItem_pkey; Type: CONSTRAINT; Schema: public; Owner: invoice_user
--

ALTER TABLE ONLY public."InvoiceItem"
    ADD CONSTRAINT "InvoiceItem_pkey" PRIMARY KEY (id);


--
-- Name: Invoice Invoice_pkey; Type: CONSTRAINT; Schema: public; Owner: invoice_user
--

ALTER TABLE ONLY public."Invoice"
    ADD CONSTRAINT "Invoice_pkey" PRIMARY KEY (id);


--
-- Name: PaymentMethod PaymentMethod_pkey; Type: CONSTRAINT; Schema: public; Owner: invoice_user
--

ALTER TABLE ONLY public."PaymentMethod"
    ADD CONSTRAINT "PaymentMethod_pkey" PRIMARY KEY (id);


--
-- Name: Product Product_pkey; Type: CONSTRAINT; Schema: public; Owner: invoice_user
--

ALTER TABLE ONLY public."Product"
    ADD CONSTRAINT "Product_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: invoice_user
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: Invoice_invoiceNumber_key; Type: INDEX; Schema: public; Owner: invoice_user
--

CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON public."Invoice" USING btree ("invoiceNumber");


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: invoice_user
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: EmailLog EmailLog_invoiceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoice_user
--

ALTER TABLE ONLY public."EmailLog"
    ADD CONSTRAINT "EmailLog_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES public."Invoice"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: InvoiceItem InvoiceItem_invoiceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoice_user
--

ALTER TABLE ONLY public."InvoiceItem"
    ADD CONSTRAINT "InvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES public."Invoice"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: InvoiceItem InvoiceItem_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoice_user
--

ALTER TABLE ONLY public."InvoiceItem"
    ADD CONSTRAINT "InvoiceItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Invoice Invoice_clientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoice_user
--

ALTER TABLE ONLY public."Invoice"
    ADD CONSTRAINT "Invoice_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES public."Client"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Invoice Invoice_companyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoice_user
--

ALTER TABLE ONLY public."Invoice"
    ADD CONSTRAINT "Invoice_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES public."Company"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Invoice Invoice_paymentMethodId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoice_user
--

ALTER TABLE ONLY public."Invoice"
    ADD CONSTRAINT "Invoice_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES public."PaymentMethod"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Invoice Invoice_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: invoice_user
--

ALTER TABLE ONLY public."Invoice"
    ADD CONSTRAINT "Invoice_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--
-- Insert default admin user
INSERT INTO public."User" (id, email, password, name, role) 
VALUES ('330807c9-bafc-4dd1-9716-e77118e756a5', 'admin@gmail.com', '$2b$10$1pDqrzf7UvQ01JHcC7XbLuZ0VZ4b3VdNG02UuWbJJhPX52k3ieH9e', 'admin', 'SU');

