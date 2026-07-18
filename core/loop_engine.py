import asyncio, random, datetime

AGENTS = [
    {"id":"manager","name":"Manager Agent","icon":"🧭","role":"Routes work, assigns agents, controls quality gates."},
    {"id":"planner","name":"Planner Agent","icon":"🧩","role":"Breaks tasks into steps and builds the strategy."},
    {"id":"researcher","name":"Research Agent","icon":"🔎","role":"Finds facts, assumptions, risks, and context."},
    {"id":"builder","name":"Builder Agent","icon":"🛠️","role":"Creates the main deliverable, code, plan, or document."},
    {"id":"critic","name":"Critic Agent","icon":"⚠️","role":"Finds flaws, missing parts, and weak reasoning."},
    {"id":"reviewer","name":"Reviewer Agent","icon":"✅","role":"Improves clarity, quality, and final output."},
    {"id":"memory","name":"Memory Agent","icon":"🧠","role":"Stores project insights and reusable patterns."},
    {"id":"ui","name":"UI Agent","icon":"🎨","role":"Makes outputs user-friendly and presentation-ready."},
]

TEMPLATES = {
    "manager": ["Initializing agent team", "Assigning specialists", "Checking quality gate"],
    "planner": ["Creating task roadmap", "Splitting goal into milestones", "Choosing execution strategy"],
    "researcher": ["Scanning knowledge base", "Extracting key assumptions", "Collecting supporting details"],
    "builder": ["Building first solution draft", "Generating structured output", "Assembling deliverable"],
    "critic": ["Stress testing result", "Finding gaps", "Ranking improvement targets"],
    "reviewer": ["Refining final answer", "Improving professional quality", "Removing weak sections"],
    "memory": ["Saving reusable insights", "Updating project memory", "Indexing decision history"],
    "ui": ["Formatting output", "Preparing clean presentation", "Making result user-ready"],
}

async def run_agentic_loop(task: str, loops: int = 3, mode: str = "balanced"):
    loops = max(1, min(8, loops))
    quality = 25
    await asyncio.sleep(.2)
    yield {"type":"system","message":"Aegis Agentic OS boot complete."}
    yield {"type":"task","task":task,"mode":mode,"loops":loops}

    plan = [
        "Understand the user goal and expected output.",
        "Route work to specialist agents.",
        "Create a draft solution.",
        "Critique and improve through AI Loop Engineering.",
        "Deliver a polished final output."
    ]
    yield {"type":"plan","items":plan}

    final_sections = []
    for loop in range(1, loops + 1):
        yield {"type":"loop_start","loop":loop,"message":f"Loop {loop}: Plan → Build → Critique → Improve"}
        for agent in AGENTS:
            await asyncio.sleep(.45 if mode != "fast" else .2)
            action = random.choice(TEMPLATES[agent["id"]])
            delta = random.randint(3, 9)
            quality = min(99, quality + delta)
            thought = make_agent_output(agent["id"], task, loop)
            final_sections.append(thought)
            yield {
                "type":"agent_step",
                "loop":loop,
                "agent_id":agent["id"],
                "agent_name":agent["name"],
                "icon":agent["icon"],
                "action":action,
                "output":thought,
                "quality":quality,
                "timestamp":datetime.datetime.now().strftime("%H:%M:%S")
            }
        yield {"type":"loop_end","loop":loop,"quality":quality,"message":f"Loop {loop} complete. Quality score: {quality}%"}

    final = build_final(task, quality, loops)
    yield {"type":"final","quality":quality,"result":final}


def make_agent_output(agent_id, task, loop):
    outputs = {
        "manager": f"Loop {loop}: coordinated the team around the task: {task[:90]}.",
        "planner": "Created a phased execution map with objective, steps, risks, and deliverables.",
        "researcher": "Identified key context, missing information, assumptions, and validation points.",
        "builder": "Produced the main working solution structure and expanded the core content.",
        "critic": "Detected weak areas: unclear scope, missing examples, and quality risks.",
        "reviewer": "Improved wording, structure, completeness, and practical usefulness.",
        "memory": "Stored the task pattern so future outputs can reuse the best strategy.",
        "ui": "Converted the result into a clean dashboard-ready output format."
    }
    return outputs.get(agent_id, "Processed task.")


def build_final(task, quality, loops):
    return f"""# Final AI Team Output\n\n## User Task\n{task}\n\n## Agentic OS Result\nThe AI team completed {loops} improvement loop(s). The system planned, researched, built, criticized, reviewed, and polished the answer using an AI Loop Engineering workflow.\n\n## Recommended Solution\n1. Define the exact goal and desired output.\n2. Break the task into clear modules.\n3. Assign each module to a specialist agent.\n4. Generate a first draft.\n5. Run critique and improvement cycles.\n6. Produce the final polished deliverable.\n\n## Quality Score\n{quality}%\n\n## Next Upgrade\nConnect real LLM APIs by adding your API keys in a `.env` file, then replace the simulated agent outputs with live model calls.\n"""
