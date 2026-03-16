import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.database import Base, engine
from app.models import models
from app.routes import leads, behavior, services, auth, analytics


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield

app = FastAPI(
    lifespan=lifespan,
    root_path="/api",
    docs_url="/docs",
    openapi_url="/openapi.json",
    redirect_slashes=False
)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    logging.error("Validation error: %s", exc.errors())
    logging.error("Body: %s", await request.body())
    return JSONResponse(status_code=422, content={"detail": exc.errors()})


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost", "http://nginx"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(leads.router)
app.include_router(behavior.router)
app.include_router(services.router)
app.include_router(auth.router)
app.include_router(analytics.router)

@app.get("/")
def root():
    return {"status": "ok"}