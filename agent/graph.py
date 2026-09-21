import os
from pathlib import Path

from langchain.agents import create_agent
from langchain_core.runnables.graph_mermaid import draw_mermaid_png
from langchain_groq import ChatGroq
from langgraph.graph import START, END, StateGraph

from agent.prompts import planner_prompt, architect_prompt, coder_system_prompt 
from agent.states import WorkflowState, CoderState, Plan, TaskPlan
from agent.tools import read_file, write_file, list_files, get_current_directory

from dotenv import load_dotenv
load_dotenv()


def get_llm():
    load_dotenv(override=True)
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise ValueError(
            "GROQ_API_KEY is not set. Please add a valid GROQ_API_KEY in your .env file."
        )
    model = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
    return ChatGroq(model=model, groq_api_key=api_key)


def planner_node(state: WorkflowState) -> dict:
    """Converts user prompt into a structured Plan"""

    user_prompt = state["user_prompt"]
    llm = get_llm()

    resp = llm.with_structured_output(Plan).invoke(
        planner_prompt(user_prompt=user_prompt)
    )
    
    if resp is None:
        raise ValueError("Planner did not return a valid response.")
    
    return {"plan": resp}


def architect_node(state: WorkflowState) -> dict:
    """Creates TaskPlan from Plan."""

    plan: Plan = state["plan"]
    llm = get_llm()

    resp = llm.with_structured_output(TaskPlan).invoke(
        architect_prompt(plan=plan.model_dump_json())
    )

    if resp is None:
        raise ValueError("Architect did not return a valid response.")

    resp.plan = plan

    return {"task_plan": resp}


def coder_node(state: WorkflowState) -> dict:
    """LangGraph tool-using coder agent."""

    coder_state: CoderState = state.get("coder_state")

    if coder_state is None:
        coder_state = CoderState(task_plan=state["task_plan"], current_step_idx=0)

    steps = coder_state.task_plan.implementation_steps

    if coder_state.current_step_idx >= len(steps):
        return {"coder_state": coder_state, "status": "DONE"}

    current_task = steps[coder_state.current_step_idx]
    existing_content = read_file.run(current_task.filepath)

    system_prompt = coder_system_prompt()
    user_prompt = (
        f"Task: {current_task.task_description}\n"
        f"File: {current_task.filepath}\n"
        f"Existing content:\n{existing_content}\n"
        "Use write_file(path, content) to save your changes."
    )

    coder_tools = [read_file, write_file, list_files, get_current_directory]

    coder_agent = create_agent(
        model=get_llm(),
        tools=coder_tools,
        system_prompt=system_prompt,
    )

    coder_agent.invoke(
        {"messages": [{"role": "user", "content": user_prompt}]}
    )

    coder_state.current_step_idx += 1

    return {"coder_state": coder_state}


def generate_graph_image(output_path: str | Path | None = None) -> Path:
    """Render the compiled workflow graph to a PNG file."""

    target = Path(output_path) if output_path else Path(__file__).resolve().parent.parent / "images" / "codebuddy_graph.png"
    target = target.resolve()
    target.parent.mkdir(parents=True, exist_ok=True)

    mermaid = agent.get_graph().draw_mermaid().replace("graph TD;", "graph LR;", 1)
    target.write_bytes(draw_mermaid_png(mermaid_syntax=mermaid))

    return target


graph = StateGraph(WorkflowState)

graph.add_node("planner", planner_node)
graph.add_node("architect", architect_node)
graph.add_node("coder", coder_node)

graph.add_edge(START, "planner")
graph.add_edge("planner", "architect")
graph.add_edge("architect", "coder")

graph.add_conditional_edges(
    "coder",
    lambda s: "END" if s.get("status") == "DONE" else "coder",
    {"END": END, "coder": "coder"}
)

agent = graph.compile()


if __name__ == "__main__":
    # generate_graph_image()
    
    result = agent.invoke(
        {"user_prompt": "Build a modern todo app in html css and js"},
        {"recursion_limit": 100}
    )

    print("Final State:", result)

