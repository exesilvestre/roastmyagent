from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


class LlmProviderOut(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    id: str
    label: str
    model: str | None
    has_api_key: bool
    is_active: bool


class LlmProviderUpdate(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    api_key: str | None = None
    model: str | None = None


class OllamaHealthOut(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    ok: bool
